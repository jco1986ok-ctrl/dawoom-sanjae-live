import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import type { LeadDetail } from "@/lib/lead-detail";
import { getLeadLastUpdatedAt } from "@/lib/v2-task-aging";

/** V2 — 마스터·총괄·대표는 전체, 그 외는 내 업무만 */
export function shouldUseV2MyTasksView(testRole: DashboardTestRole): boolean {
  return testRole !== "마스터" && testRole !== "대표노무사" && testRole !== "총괄파트너";
}

export function filterV2MyTaskLeads(leads: LeadDetail[], viewerUserId: string): LeadDetail[] {
  return leads.filter((lead) => lead.assigned_user_id === viewerUserId);
}

/** 미열람(is_read=false) 건을 최상단, 이후 최신순 */
export function sortV2MyTaskLeads(leads: LeadDetail[]): LeadDetail[] {
  return [...leads].sort((a, b) => {
    const aUnread = a.is_read === false ? 0 : 1;
    const bUnread = b.is_read === false ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;
    return new Date(getLeadLastUpdatedAt(a)).getTime() - new Date(getLeadLastUpdatedAt(b)).getTime();
  });
}

export function isV2UnreadAssignment(lead: Pick<LeadDetail, "is_read">): boolean {
  return lead.is_read === false;
}
