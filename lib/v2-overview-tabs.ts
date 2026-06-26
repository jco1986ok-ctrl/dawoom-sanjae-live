import type { LeadDetail } from "@/lib/lead-detail";
import { normalizeV2LeadStatus, V2_LEAD_STATUS_OPTIONS } from "@/lib/v2-lead-status";

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

const IN_PROGRESS_STATUSES = new Set<string>([
  "서류 취합 중",
  "현장방문 예정",
  "노무사 서면작성 대기",
  "공단접수 대기",
  "공단 심사/결과 대기",
]);

export type V2OverviewKpi = {
  totalIntake: number;
  consulting: number;
  inProgress: number;
  completed: number;
};

export function computeV2OverviewKpi(statusCount: Record<string, number>): V2OverviewKpi {
  const normalized: Record<string, number> = {};
  for (const [raw, count] of Object.entries(statusCount)) {
    const key = normalizeV2LeadStatus(raw);
    normalized[key] = (normalized[key] ?? 0) + count;
  }

  const consulting = normalized["1차 전화상담 대기"] ?? 0;
  const inProgress = [...IN_PROGRESS_STATUSES].reduce(
    (sum, status) => sum + (normalized[status] ?? 0),
    0,
  );
  const totalIntake = V2_LEAD_STATUS_OPTIONS.reduce(
    (sum, status) => sum + (normalized[status] ?? 0),
    0,
  );

  return {
    totalIntake,
    consulting,
    inProgress,
    completed: 0,
  };
}

export function sortLeadsByRecency(leads: LeadDetail[]): LeadDetail[] {
  return [...leads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
