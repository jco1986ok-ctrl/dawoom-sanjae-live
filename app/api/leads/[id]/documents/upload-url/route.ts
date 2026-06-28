import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminDocumentsUploadAccess } from "@/lib/docs-api-auth";
import { isValidSupabaseStorageKey } from "@/lib/lead-doc-upload";

/** Storage RLS 우회 — 서버(Service Role)가 signed upload URL 발급 (파일 본문 없음) */
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

  let body: { storagePath?: string; upsert?: boolean };
  try {
    body = (await request.json()) as { storagePath?: string; upsert?: boolean };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const storagePath = body.storagePath?.trim();
  if (!storagePath || storagePath.includes("..")) {
    return NextResponse.json({ error: "저장 경로가 올바르지 않습니다." }, { status: 400 });
  }

  if (!storagePath.startsWith(`${leadId}/`)) {
    return NextResponse.json({ error: "허용되지 않은 저장 경로입니다." }, { status: 403 });
  }

  if (!isValidSupabaseStorageKey(storagePath)) {
    return NextResponse.json(
      { error: "Storage 경로에 허용되지 않는 문자가 포함되어 있습니다." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const upsert = body.upsert !== false;

  const { data, error } = await admin.storage
    .from("documents")
    .createSignedUploadUrl(storagePath, { upsert });

  if (error || !data) {
    console.error("[upload-url]", error);
    return NextResponse.json(
      { error: error?.message ?? "업로드 URL 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    storagePath,
  });
}
