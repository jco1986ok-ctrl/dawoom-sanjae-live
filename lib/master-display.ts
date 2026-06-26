/** 조직도·대시보드에 표시할 마스터(관리자) 표기명 */
export const MASTER_CANONICAL_NAME = "정찬옥";

export function isMasterAdminRole(role: string): boolean {
  return role === "관리자";
}

/** DB에 남아 있는 구 명칭(다움비즈랩스CEO 등) 포함 — 관리자는 항상 정찬옥 */
export function normalizeMasterDisplayName(name: string, role: string): string {
  if (!isMasterAdminRole(role)) return name;
  return MASTER_CANONICAL_NAME;
}
