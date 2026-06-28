/** 고객·파트너 공유용 공식 사이트 (카카오 OG · 링크 복사 공통) */
export const PRODUCTION_SITE_URL = "https://pharos-sanjae.com";

/** 서버·클라이언트 공통 — 복사·OG에 쓸 절대 URL (VERCEL_URL/localhost 사용 안 함) */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return PRODUCTION_SITE_URL;
}
