import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertDocumentsApiAccess } from "@/lib/docs-api-auth";
import { deriveLeadDocsStatus } from "@/lib/lead-docs-status";
import {
  DOC_KEY_LABELS,
  deriveLeadDocFiles,
  getCollectedDocKeys,
} from "@/lib/lead-doc-files";
import { generatePlaceholderDocPdf } from "@/lib/placeholder-doc-pdf";

async function loadLead(leadId: string) {
  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("id, customer_name, pdf_url, docs_status")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;
  return lead;
}

async function fetchDocBytes(storagePath: string): Promise<Uint8Array | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").download(storagePath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await assertDocumentsApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId } = await context.params;
  if (!leadId) {
    return NextResponse.json({ error: "leadId가 필요합니다." }, { status: 400 });
  }

  const lead = await loadLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "고객 데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  const status = deriveLeadDocsStatus(lead);
  const collected = getCollectedDocKeys(status);
  if (collected.length === 0) {
    return NextResponse.json({ error: "수집된 서류가 없습니다." }, { status: 404 });
  }

  const files = deriveLeadDocFiles(lead);
  const customerName = String(lead.customer_name ?? "고객").replace(/[^\w가-힣.-]/g, "_");
  const zip = new JSZip();

  for (const key of collected) {
    const label = DOC_KEY_LABELS[key];
    const metas = files[key] ?? [];

    if (metas.length === 0) {
      const bytes = await generatePlaceholderDocPdf(label, customerName);
      zip.file(`${customerName}_${label}.pdf`, bytes);
      continue;
    }

    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      let bytes: Uint8Array | null = null;
      if (meta.storagePath) {
        bytes = await fetchDocBytes(meta.storagePath);
      }
      if (!bytes) {
        bytes = await generatePlaceholderDocPdf(label, customerName);
      }
      const fileName =
        metas.length > 1
          ? `${customerName}_${label}_${i + 1}_${meta.fileName}`
          : meta.fileName;
      zip.file(fileName, bytes);
    }
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const zipName = `${customerName}_취합서류_${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(Buffer.from(zipBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
