/**
 * V2 샌드박스 — 마스터(관리자) 전용.
 * DB role `관리자` = 제품 문서상 master.
 */
export function isDashboardV2MasterRole(role: string | null | undefined): boolean {
  return role === "관리자" || role === "master";
}
