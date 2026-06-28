/** V2 샌드박스 배포 확인 — Vercel 빌드 시 커밋 SHA, 로컬은 dev */
export const V2_BUILD_TAG =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev-local";
