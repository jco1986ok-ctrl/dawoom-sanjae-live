import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertDocumentsApiAccess } from "@/lib/docs-api-auth";
import { deriveLeadDocsStatus } from "@/lib/lead-docs-status";
import {
  DOC_KEY_LABELS,
  deriveLeadDocFiles,
  docHasStoredFile,
  isLeadDocKey,
  type LeadDocKey,
} from "@/lib/lead-doc-files";
import { generatePlaceholderDocPdf } from "@/lib/placeholder-doc-pdf";
import {
  buildDocsStatusAfterUpload,
  buildLeadDocStoragePath,
  isManualUploadDocKey,
  sanitizeUploadFileName,
  validateUploadFile,
} from "@/lib/lead-doc-upload";

async function loadLead(leadId: string) {
  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("id, customer_name, pdf_url, has_weim, docs_status")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;
  return lead;
}

async function fetchDocBytes(
  storagePath: string,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").download(storagePath);
  if (error || !data) return null;
  const buffer = new Uint8Array(await data.arrayBuffer());
  const mimeType = data.type || "application/octet-stream";
  return { bytes: buffer, mimeType };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; docKey: string }> },
) {
  const auth = await assertDocumentsApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId, docKey: rawKey } = await context.params;
  if (!leadId || !rawKey || !isLeadDocKey(rawKey)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const docKey = rawKey as LeadDocKey;

  const lead = await loadLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "고객 데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  const status = deriveLeadDocsStatus(lead);
  if (!status[docKey]) {
    return NextResponse.json({ error: "수집되지 않은 서류입니다." }, { status: 404 });
  }

  const files = deriveLeadDocFiles(lead);
  const fileList = files[docKey] ?? [];
  const indexRaw = request.nextUrl.searchParams.get("index");
  const fileIndex =
    indexRaw != null && Number.isFinite(Number.parseInt(indexRaw, 10))
      ? Math.max(0, Number.parseInt(indexRaw, 10))
      : 0;
  const meta = fileList[fileIndex] ?? fileList[0];
  const mode = request.nextUrl.searchParams.get("mode") === "attachment" ? "attachment" : "inline";
  const customerName = String(lead.customer_name ?? "고객");
  const label = DOC_KEY_LABELS[docKey];
  const fileName = meta?.fileName ?? `${customerName}_${label}.pdf`;

  let bytes: Uint8Array;
  let mimeType = meta?.mimeType ?? "application/pdf";

  if (docHasStoredFile(docKey, status, files) && meta?.storagePath) {
    const fetched = await fetchDocBytes(meta.storagePath);
    if (fetched) {
      bytes = fetched.bytes;
      mimeType = fetched.mimeType || mimeType;
    } else {
      bytes = await generatePlaceholderDocPdf(label, customerName);
      mimeType = "application/pdf";
    }
  } else {
    bytes = await generatePlaceholderDocPdf(label, customerName);
    mimeType = "application/pdf";
  }

  const disposition =
    mode === "attachment"
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : `inline; filename="${encodeURIComponent(fileName)}"`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; docKey: string }> },
) {
  const auth = await assertDocumentsApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId, docKey: rawKey } = await context.params;
  if (!leadId || !rawKey || !isLeadDocKey(rawKey) || !isManualUploadDocKey(rawKey)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const docKey = rawKey as LeadDocKey;

  const lead = await loadLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "고객 데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "업로드 중 오류가 발생했습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
  }

  const validationError = validateUploadFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const safeOriginal = sanitizeUploadFileName(file.name);
  const storagePath = buildLeadDocStoragePath(leadId, docKey, safeOriginal);
  const fileMeta = {
    storagePath,
    fileName: safeOriginal,
    mimeType,
  };

  const admin = createAdminClient();
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[doc-upload]", uploadError);
    return NextResponse.json(
      { error: "업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const docs_status = buildDocsStatusAfterUpload(lead.docs_status, docKey, fileMeta);

  const { error: updateError } = await admin
    .from("leads")
    .update({ docs_status })
    .eq("id", leadId);

  if (updateError) {
    console.error("[doc-upload] DB update", updateError);
    return NextResponse.json(
      { error: "업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const updatedLead = {
    ...lead,
    docs_status,
  };
  const docsStatus = deriveLeadDocsStatus(updatedLead);
  const allDocFiles = deriveLeadDocFiles(updatedLead);

  return NextResponse.json({
    success: true,
    docKey,
    docsStatus,
    docs_status,
    docFiles: allDocFiles,
  });
}

