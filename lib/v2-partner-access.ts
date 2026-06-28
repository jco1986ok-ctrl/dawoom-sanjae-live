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

/** 고객(DB) 탭 — 단계·질병 퀵 필터 (마스터·대표노무사·노무사·총괄만) */
const V2_CUSTOMER_DB_FILTER_ROLES: readonly DashboardTestRole[] = [
  "마스터",
  "대표노무사",
  "노무사",
  "총괄파트너",
] as const;

export function canUseV2CustomerDbFilters(role: DashboardTestRole): boolean {
  return (V2_CUSTOMER_DB_FILTER_ROLES as readonly string[]).includes(role);
}

/** AI 상담 요약·노무사 메모 타임라인 — 내부 직원 전용 */
export function canViewV2InternalConsultSummary(role: DashboardTestRole): boolean {
  return !isV2ExternalPartnerRole(role);
}

/** 유입 파트너(referred_by_user_id)가 본인인 접수만 */
export function filterLeadsReferredByViewer(
  leads: LeadDetail[],
  viewerUserId: string,
): LeadDetail[] {
  if (!viewerUserId) return [];
  return leads.filter((lead) => lead.referred_by_user_id === viewerUserId);
}
