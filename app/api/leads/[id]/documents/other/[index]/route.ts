import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertDocumentsApiAccess } from "@/lib/docs-api-auth";
import { parseOtherDocs } from "@/lib/lead-other-docs";

async function loadLead(leadId: string) {
  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from("leads")
    .select("id, other_docs")
    .eq("id", leadId)
    .maybeSingle();
  if (error || !lead) return null;
  return lead;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; index: string }> },
) {
  const auth = await assertDocumentsApiAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId, index: indexRaw } = await context.params;
  const index = Number.parseInt(indexRaw, 10);
  if (!leadId || !Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const lead = await loadLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "고객 데이터를 찾을 수 없습니다." }, { status: 404 });
  }

  const otherDocs = parseOtherDocs(lead.other_docs);
  const entry = otherDocs[index];
  if (!entry?.storagePath) {
    return NextResponse.json({ error: "기타 서류를 찾을 수 없습니다." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").download(entry.storagePath);
  if (error || !data) {
    return NextResponse.json({ error: "파일을 불러올 수 없습니다." }, { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const mimeType = entry.mimeType || data.type || "application/octet-stream";
  const mode = request.nextUrl.searchParams.get("mode") === "attachment" ? "attachment" : "inline";
  const disposition =
    mode === "attachment"
      ? `attachment; filename="${encodeURIComponent(entry.fileName)}"`
      : `inline; filename="${encodeURIComponent(entry.fileName)}"`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
    },
  });
}
