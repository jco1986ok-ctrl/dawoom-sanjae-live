import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 어드민 클라이언트 (Service Role Key 사용)
 * - 반드시 서버 사이드(Server Action, API Route, Server Component)에서만 호출하세요.
 * - 이 함수를 클라이언트 컴포넌트에서 import하면 Service Role Key가 브라우저에 노출됩니다.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 .env.local에 설정되지 않았습니다.\n" +
        "Supabase Dashboard → Project Settings → API → service_role 키를 복사해 넣으세요.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // 서버 전용 클라이언트: 세션 자동갱신/저장 비활성화
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
