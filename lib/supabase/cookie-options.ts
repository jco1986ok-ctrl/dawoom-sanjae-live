import type { CookieOptions } from "@supabase/ssr";

/** 세션 쿠키 유효 기간 — 1년 (초) */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

/** Supabase SSR 공통 cookieOptions (모바일 Safari/Chrome 호환) */
export const supabaseCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: SESSION_MAX_AGE,
};

export function mergeSupabaseCookieOptions(
  options?: CookieOptions,
): CookieOptions {
  return {
    ...options,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: options?.httpOnly ?? true,
    maxAge: SESSION_MAX_AGE,
  };
}

/** 오픈 리다이렉트 방지 — 내부 경로만 허용 */
export function sanitizeAuthRedirect(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}
