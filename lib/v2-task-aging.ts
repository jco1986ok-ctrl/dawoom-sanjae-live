import type { LeadDetail } from "@/lib/lead-detail";

export const V2_AGING_STALE_DAYS = 7;

const TERMINAL_STATUSES = new Set([
  "산재승인(완료)",
  "종결(수임불가)",
  "종결",
]);

export function getLeadLastUpdatedAt(lead: Pick<LeadDetail, "last_updated_at" | "created_at">): string {
  return lead.last_updated_at ?? lead.created_at;
}

export function isLeadTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isLeadAgingStale(
  lead: Pick<LeadDetail, "last_updated_at" | "created_at" | "consultation_status">,
  staleDays = V2_AGING_STALE_DAYS,
): boolean {
  if (isLeadTerminalStatus(lead.consultation_status)) return false;
  const updated = new Date(getLeadLastUpdatedAt(lead)).getTime();
  const threshold = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  return updated < threshold;
}

export function isCallbackToday(callbackDate: string | null | undefined, now = new Date()): boolean {
  if (!callbackDate) return false;
  const target = callbackDate.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return target === today;
}

export function getV2AgingRowClass(
  lead: Pick<LeadDetail, "last_updated_at" | "created_at" | "consultation_status">,
): string {
  return isLeadAgingStale(lead) ? "bg-red-50 ring-1 ring-inset ring-red-500" : "";
}

/** 담당 화면 — 미열람 우선, 이후 오래 방치된 순 */
export function sortV2AssigneeLeads<T extends LeadDetail & { is_read?: boolean | null }>(
  leads: T[],
): T[] {
  return [...leads].sort((a, b) => {
    const aUnread = a.is_read === false ? 0 : 1;
    const bUnread = b.is_read === false ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;

    const aTime = new Date(getLeadLastUpdatedAt(a)).getTime();
    const bTime = new Date(getLeadLastUpdatedAt(b)).getTime();
    return aTime - bTime;
  });
}

export type V2DailyBriefingSummary = {
  staleCount: number;
  callbackTodayCount: number;
  totalAssigned: number;
  staleSamples: { id: string; customerName: string }[];
  callbackSamples: { id: string; customerName: string }[];
};

export function computeV2DailyBriefing(
  leads: LeadDetail[],
  viewerUserId: string,
): V2DailyBriefingSummary {
  const mine = leads.filter(
    (l) => l.assigned_user_id === viewerUserId && !isLeadTerminalStatus(l.consultation_status),
  );

  const stale = mine.filter((l) => isLeadAgingStale(l));
  const callbackToday = mine.filter((l) => isCallbackToday(l.callback_date));

  return {
    staleCount: stale.length,
    callbackTodayCount: callbackToday.length,
    totalAssigned: mine.length,
    staleSamples: stale.slice(0, 3).map((l) => ({
      id: l.id,
      customerName: l.customer_name,
    })),
    callbackSamples: callbackToday.slice(0, 3).map((l) => ({
      id: l.id,
      customerName: l.customer_name,
    })),
  };
}
