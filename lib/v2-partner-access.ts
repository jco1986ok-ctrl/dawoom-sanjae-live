import type { LeadDetail } from "@/lib/lead-detail";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";

/** 외부 영업 파트너 (공식·제휴) — 고객 DB 열람 전용 */
export const V2_EXTERNAL_PARTNER_ROLES: readonly DashboardTestRole[] = [
  "공식파트너",
  "제휴파트너",
] as const;

export function isV2ExternalPartnerRole(role: DashboardTestRole): boolean {
  return (V2_EXTERNAL_PARTNER_ROLES as readonly string[]).includes(role);
}

/** 유입 파트너(referred_by_user_id)가 본인인 접수만 */
export function filterLeadsReferredByViewer(
  leads: LeadDetail[],
  viewerUserId: string,
): LeadDetail[] {
  if (!viewerUserId) return [];
  return leads.filter((lead) => lead.referred_by_user_id === viewerUserId);
}
