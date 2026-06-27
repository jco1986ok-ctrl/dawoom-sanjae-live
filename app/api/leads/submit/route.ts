import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { insertLeadFromPayload } from "@/lib/leads-insert";
import { createIntakeUploadToken } from "@/lib/intake-upload-token";

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  if (!serviceKey) throw new Error("ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY가 없습니다.");

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  let supabase: ReturnType<typeof makeSupabaseClient>;
  try {
    supabase = makeSupabaseClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[leads/submit] Supabase 초기화 실패:", msg);
    return NextResponse.json(
      { error: `서버 설정 오류: ${msg}` },
      { status: 500 },
    );
  }

  const result = await insertLeadFromPayload(supabase, body as Parameters<
    typeof insertLeadFromPayload
  >[1]);

  if (!result.success) {
    console.error("[leads/submit] DB INSERT 실패:", result.error, result.debug);
    return NextResponse.json(
      {
        error: result.error,
        debug: result.debug,
      },
      { status: 500 },
    );
  }

  console.log("[leads/submit] ✅ 접수 성공:", result.leadId);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard-v2", "layout");

  let uploadToken: string | undefined;
  try {
    uploadToken = createIntakeUploadToken(result.leadId);
  } catch (tokenErr) {
    console.warn("[leads/submit] intake upload token 생성 실패:", tokenErr);
  }

  return NextResponse.json({ success: true, leadId: result.leadId, uploadToken });
}
