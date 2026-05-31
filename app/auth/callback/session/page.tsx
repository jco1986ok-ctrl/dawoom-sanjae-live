"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeAuthRedirect } from "@/lib/supabase/cookie-options";

/**
 * 모바일 인앱 브라우저(카카오톡 등)용 — URL hash(#access_token) 세션 복구.
 * hash는 서버 Route Handler로 전달되지 않으므로 클라이언트에서 처리.
 */
export default function AuthCallbackSessionPage() {
  const [message, setMessage] = useState("로그인 처리 중…");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const next = sanitizeAuthRedirect(params.get("next"));
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = params.get("code");

      const supabase = createClient();

      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          window.history.replaceState({}, "", "/auth/callback/session");
          window.location.replace(next);
          return;
        }

        if (code) {
          window.location.replace(
            `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
          );
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!error && data.session) {
          window.location.replace(next);
          return;
        }

        setMessage("세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
        window.setTimeout(() => {
          window.location.replace("/login?error=auth_callback");
        }, 1500);
      } catch {
        setMessage("로그인 연결에 실패했습니다. 다시 시도해 주세요.");
        window.setTimeout(() => {
          window.location.replace("/login?error=auth_callback");
        }, 1500);
      }
    };

    void run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}
