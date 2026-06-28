/**
 * 라이브 대시보드 vs V2 샌드박스 — 경계 정의 (단일 기준)
 *
 * Git 스코프 검사: npm run check:v2-scope
 * 라이브 승격 전: npm run promote:checklist
 */

export const DASHBOARD_BOARDS = {
  live: {
    id: "live",
    label: "라이브 대시보드",
    routePrefix: "/dashboard",
    appDir: "app/dashboard",
  },
  v2: {
    id: "v2",
    label: "V2 테스트 보드",
    routePrefix: "/dashboard-v2",
    appDir: "app/dashboard-v2",
    /** 마스터(관리자)만 접근 — 시연·QA용 */
    accessNote: "관리자 role 전용",
  },
} as const;

export const BOARD_URLS = {
  production: "https://pharos-sanjae.com",
  liveDashboard: "https://pharos-sanjae.com/dashboard",
  liveMyBoard: "https://pharos-sanjae.com/dashboard/my-board",
  v2Dashboard: "https://pharos-sanjae.com/dashboard-v2",
  v2MyBoard: "https://pharos-sanjae.com/dashboard-v2/my-board",
  intake: "https://pharos-sanjae.com",
} as const;

/** V2 작업 커밋에 포함해도 되는 경로 (glob → 정규식은 scripts/check-board-scope.mjs) */
export const V2_COMMIT_PATH_PREFIXES = [
  "app/dashboard-v2/",
  "lib/v2-",
  "lib/dashboard-v2-access.ts",
  "supabase/24_",
  "supabase/25_",
  "supabase/26_",
  "supabase/27_",
  "config/dashboard-boards.ts",
  "scripts/check-board-scope.mjs",
  "scripts/promote-checklist.mjs",
  ".cursor/rules/",
] as const;

/**
 * 접수·양쪽 대시보드에 영향 — V2 작업과 같은 커밋에 넣지 말 것 (hotfix는 별도 커밋)
 */
export const SHARED_CRITICAL_PATH_PREFIXES = [
  "lib/leads-insert.ts",
  "lib/intake-safe-defaults.ts",
  "app/api/leads/",
  "components/DynamicForm.tsx",
  "components/HomeClient.tsx",
  "app/page.tsx",
] as const;

/** 라이브 승격 시 복사·연결 대상 */
export const LIVE_PROMOTE_PATH_PREFIXES = ["app/dashboard/"] as const;

export const GIT_BRANCH_CONVENTION = {
  production: "main",
  v2Feature: "feature/v2-<기능명>",
  intakeHotfix: "fix/intake-<설명>",
  livePromote: "promote/live-<기능명>",
} as const;
