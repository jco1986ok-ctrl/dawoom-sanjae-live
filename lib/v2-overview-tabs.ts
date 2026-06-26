import type { LeadDetail } from "@/lib/lead-detail";
import { computeStatusGroupSummaries } from "@/lib/overview-dashboard";

export const V2_OVERVIEW_TAB_IDS = [
  "summary",
  "finance",
  "team",
  "schedule",
  "faq",
] as const;

export type V2OverviewTabId = (typeof V2_OVERVIEW_TAB_IDS)[number];

export const V2_OVERVIEW_TAB_LABELS: Record<V2OverviewTabId, string> = {
  summary: "상담 요약",
  finance: "금액 현황",
  team: "사업팀 매칭",
  schedule: "일정 관리",
  faq: "FAQ / Q&A",
};

const DEFAULT_TAB: V2OverviewTabId = "summary";

export function isV2OverviewTabId(value: string): value is V2OverviewTabId {
  return (V2_OVERVIEW_TAB_IDS as readonly string[]).includes(value);
}

export function parseV2OverviewHashTab(hash: string): V2OverviewTabId {
  const raw = hash.replace(/^#/, "");
  const params = new URLSearchParams(raw.includes("=") ? raw : `tab=${raw}`);
  const tab = params.get("tab");
  if (tab && isV2OverviewTabId(tab)) return tab;
  return DEFAULT_TAB;
}

export function buildV2OverviewHash(tab: V2OverviewTabId): string {
  return `#tab=${tab}`;
}

const IN_PROGRESS_STATUSES = new Set([
  "계약완료",
  "서류준비중",
  "공단접수(심사중)",
  "불승인(재심사)",
]);

export type V2OverviewKpi = {
  totalIntake: number;
  consulting: number;
  inProgress: number;
  completed: number;
};

export function computeV2OverviewKpi(statusCount: Record<string, number>): V2OverviewKpi {
  const groups = computeStatusGroupSummaries(statusCount);
  const sales = groups.find((g) => g.id === "sales")?.total ?? 0;
  const inProgress = [...IN_PROGRESS_STATUSES].reduce(
    (sum, status) => sum + (statusCount[status] ?? 0),
    0,
  );
  const completed = statusCount["산재승인(완료)"] ?? 0;
  const totalIntake = Object.values(statusCount).reduce((sum, n) => sum + n, 0);

  return {
    totalIntake,
    consulting: sales,
    inProgress,
    completed,
  };
}

export function sortLeadsByRecency(leads: LeadDetail[]): LeadDetail[] {
  return [...leads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
