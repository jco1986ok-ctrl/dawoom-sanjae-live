import type { UserRole } from "@/lib/types";

/** 조직 전체 데이터 열람 — Service Role 사용 */
export const ORG_WIDE_ACCESS_ROLES = new Set<UserRole>(["관리자", "대표노무사"]);

/** 본인 네트워크만 — 세션 RLS + headPartnerId 스코프 */
export const PARTNER_SCOPED_ROLES = new Set<UserRole>([
  "총괄공식파트너",
  "총판영업자",
  "하위영업자",
]);

export function isHeadPartnerRole(role: UserRole): boolean {
  return role === "총괄공식파트너";
}

export function hasOrgWideDashboardAccess(role: UserRole): boolean {
  return ORG_WIDE_ACCESS_ROLES.has(role);
}

export function isPartnerScopedRole(role: UserRole): boolean {
  return PARTNER_SCOPED_ROLES.has(role);
}

/** 파트너 네트워크·실적 UI — 본인 라인만 볼 때 루트 ID */
export function getPartnerNetworkHeadId(
  viewerId: string,
  role: UserRole,
): string | undefined {
  if (hasOrgWideDashboardAccess(role)) return undefined;
  if (isPartnerScopedRole(role)) return viewerId;
  return undefined;
}
