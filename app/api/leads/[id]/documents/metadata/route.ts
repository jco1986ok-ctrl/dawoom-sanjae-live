import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminDocumentsUploadAccess } from "@/lib/docs-api-auth";
import { deriveLeadDocsStatus } from "@/lib/lead-docs-status";
import {
  deriveLeadDocFiles,
  isLeadDocKey,
  type LeadDocKey,
} from "@/lib/lead-doc-files";
import {
  buildDocsStatusAfterRemove,
  buildDocsStatusAfterUpload,
  isManualUploadDocKey,
} from "@/lib/lead-doc-upload";
import { parseOtherDocs, type OtherDocEntry } from "@/lib/lead-other-docs";

type FileMetaBody = {
  storagePath: string;
  fileName: string;
  mimeType: string;
};

async function loadLead(leadId: string) {
  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("id, customer_name, pdf_url, has_weim, docs_status, other_docs")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;
  return lead;
}

function parseFileMeta(raw: unknown): FileMetaBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.storagePath !== "string" ||
    typeof o.fileName !== "string" ||
    typeof o.mimeType !== "string"
  ) {
    return null;
  }
  return {
    storagePath: o.storagePath,
    fileName: o.fileName,
    mimeType: o.mimeType,
  };
}

function parseFileMetas(raw: unknown): FileMetaBody[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => parseFileMeta(item))
    .filter((item): item is FileMetaBody => item !== null);
}

function parseOtherEntries(raw: unknown): OtherDocEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      if (
        typeof o.storagePath !== "string" ||
        typeof o.fileName !== "string" ||
        typeof o.mimeType !== "string"
      ) {
        return null;
      }
      return {
        storagePath: o.storagePath,
        fileName: o.fileName,
        mimeType: o.mimeType,
        uploadedAt:
          typeof o.uploadedAt === "string" ? o.uploadedAt : new Date().toISOString(),
        slotId: typeof o.slotId === "string" ? o.slotId : undefined,
        category:
          o.category === "medical" || o.category === "personal" || o.category === "institution"
            ? o.category
            : undefined,
      } satisfies OtherDocEntry;
    })
    .filter((e): e is OtherDocEntry => e !== null);
}

/** 파일 본문 없이 docs_status · other_docs 메타만 갱신 (직접 Storage 업로드 후) */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await assertAdminDocumentsUploadAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId } = await context.params;
  if (!leadId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const lead = await loadLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "고객 데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  const admin = createAdminClient();
  const type = body.type;

  if (type === "standard") {
    const docKeyRaw = body.docKey;
    if (typeof docKeyRaw !== "string" || !isLeadDocKey(docKeyRaw) || !isManualUploadDocKey(docKeyRaw)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const docKey = docKeyRaw as LeadDocKey;

    const batchMetas = parseFileMetas(body.fileMetas);
    const singleMeta = parseFileMeta(body.fileMeta);
    const fileMetas = batchMetas.length > 0 ? batchMetas : singleMeta ? [singleMeta] : [];

    if (fileMetas.length === 0) {
      return NextResponse.json({ error: "파일 메타 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const docs_status = buildDocsStatusAfterUpload(lead.docs_status, docKey, fileMetas);

    const { error: updateError } = await admin
      .from("leads")
      .update({ docs_status })
      .eq("id", leadId);

    if (updateError) {
      console.error("[doc-metadata] DB update", updateError);
      return NextResponse.json({ error: "서류 정보 저장에 실패했습니다." }, { status: 500 });
    }

    const updatedLead = { ...lead, docs_status };
    return NextResponse.json({
      success: true,
      docKey,
      docsStatus: deriveLeadDocsStatus(updatedLead),
      docs_status,
      docFiles: deriveLeadDocFiles(updatedLead),
    });
  }

  if (type === "standard_remove") {
    const docKeyRaw = body.docKey;
    const storagePath = body.storagePath;
    if (
      typeof docKeyRaw !== "string" ||
      !isLeadDocKey(docKeyRaw) ||
      !isManualUploadDocKey(docKeyRaw) ||
      typeof storagePath !== "string" ||
      !storagePath.trim()
    ) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const docKey = docKeyRaw as LeadDocKey;

    const docs_status = buildDocsStatusAfterRemove(
      lead.docs_status,
      docKey,
      storagePath.trim(),
    );

    const { error: updateError } = await admin
      .from("leads")
      .update({ docs_status })
      .eq("id", leadId);

    if (updateError) {
      console.error("[doc-metadata] remove", updateError);
      return NextResponse.json({ error: "서류 삭제에 실패했습니다." }, { status: 500 });
    }

    const updatedLead = { ...lead, docs_status };
    return NextResponse.json({
      success: true,
      docKey,
      docsStatus: deriveLeadDocsStatus(updatedLead),
      docs_status,
      docFiles: deriveLeadDocFiles(updatedLead),
    });
  }

  if (type === "other") {
    const append = parseOtherEntries(body.append);
    if (append.length === 0) {
      return NextResponse.json({ error: "추가할 기타 서류가 없습니다." }, { status: 400 });
    }

    const existing = parseOtherDocs(lead.other_docs);
    const other_docs = [...existing, ...append];

    const { error: updateError } = await admin
      .from("leads")
      .update({ other_docs })
      .eq("id", leadId);

    if (updateError) {
      console.error("[other-docs-metadata] DB update", updateError);
      return NextResponse.json({ error: "기타 서류 정보 저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      otherDocs: other_docs,
    });
  }

  if (type === "other_remove") {
    const storagePath = body.storagePath;
    if (typeof storagePath !== "string" || !storagePath.trim()) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const existing = parseOtherDocs(lead.other_docs);
    const other_docs = existing.filter((doc) => doc.storagePath !== storagePath.trim());

    const { error: updateError } = await admin
      .from("leads")
      .update({ other_docs })
      .eq("id", leadId);

    if (updateError) {
      console.error("[other-docs-metadata] remove", updateError);
      return NextResponse.json({ error: "기타 서류 삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      otherDocs: other_docs,
    });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
