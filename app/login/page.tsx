"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";
import InAppBrowserEscape from "@/components/pwa/InAppBrowserEscape";
import { sanitizeAuthRedirect } from "@/lib/supabase/cookie-options";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeAuthRedirect(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get("error") === "auth_callback") {
      return "로그인 세션이 만료되었거나 연결에 실패했습니다. 다시 로그인해 주세요.";
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "이메일 또는 비밀번호가 올바르지 않습니다.");
        setLoading(false);
        return;
      }

      // 모바일 Safari/Chrome: soft navigation 전 쿠키 반영을 위해 hard redirect
      window.location.assign(data.redirectTo ?? nextPath);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  return (
    <>
      <InAppBrowserEscape />
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-transparent shrink-0 mb-4">
            <ParoLogo size={80} priority className="w-16 h-16 sm:w-20 sm:h-20 bg-transparent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">노무법인 파로스</h1>
          <p className="text-sm text-muted-foreground mt-1">{PARO_GREETING}</p>
          <p className="text-xs text-muted-foreground mt-1">내부 관리 시스템 로그인</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@parros.kr"
              className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white text-base font-bold py-4 rounded-2xl mt-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
