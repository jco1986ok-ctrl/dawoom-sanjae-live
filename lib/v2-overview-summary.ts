import type { LeadDetail } from "@/lib/lead-detail";
import {
  normalizeV2LeadStatus,
  V2_LEAD_STATUS_OPTIONS,
  V2_WORK_QUEUE_STAGES,
  type V2WorkQueueStageId,
} from "@/lib/v2-lead-status";

export type V2MainSummaryCardId = "phone" | "docs_field" | "brief" | "agency";

export type V2MainSummaryCard = {
  id: V2MainSummaryCardId;
  label: string;
  subtitle: string;
  statuses: string[];
  cardClass: string;
  countClass: string;
  badgeClass: string;
};

export const V2_MAIN_SUMMARY_CARDS: V2MainSummaryCard[] = [
  {
    id: "phone",
    label: "전화상담",
    subtitle: "1차 전화상담 대기",
    statuses: ["1차 전화상담 대기"],
    cardClass: "bg-white",
    countClass: "text-sky-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "docs_field",
    label: "서류·현장",
    subtitle: "취합 · 현장방문",
    statuses: ["서류 취합 중", "현장방문 예정"],
    cardClass: "bg-white",
    countClass: "text-amber-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "brief",
    label: "서면 작성",
    subtitle: "노무사 서면작성 대기",
    statuses: ["노무사 서면작성 대기"],
    cardClass: "bg-white",
    countClass: "text-violet-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "agency",
    label: "공단",
    subtitle: "접수 · 심사/결과",
    statuses: ["공단접수 대기", "공단 심사/결과 대기"],
    cardClass: "bg-white",
    countClass: "text-indigo-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
];

export type V2MainSummaryCardSummary = V2MainSummaryCard & {
  total: number;
  breakdown: { status: string; count: number }[];
};

function countByNormalizedStatus(statusCount: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const status of V2_LEAD_STATUS_OPTIONS) {
    out[status] = 0;
  }
  for (const [raw, count] of Object.entries(statusCount)) {
    const normalized = normalizeV2LeadStatus(raw);
    if ((V2_LEAD_STATUS_OPTIONS as readonly string[]).includes(normalized)) {
      out[normalized] = (out[normalized] ?? 0) + count;
    }
  }
  return out;
}

export function computeV2MainSummaryCards(
  statusCount: Record<string, number>,
): V2MainSummaryCardSummary[] {
  const normalized = countByNormalizedStatus(statusCount);

  return V2_MAIN_SUMMARY_CARDS.map((card) => {
    const breakdown = card.statuses
      .map((status) => ({ status, count: normalized[status] ?? 0 }))
      .filter((b) => b.count > 0);
    const total = card.statuses.reduce((sum, s) => sum + (normalized[s] ?? 0), 0);
    return { ...card, total, breakdown };
  });
}

export type V2WorkQueueStageStat = {
  stage: V2WorkQueueStageId;
  label: string;
  status: string;
  count: number;
  color: string;
};

export function computeV2WorkQueueStats(leads: LeadDetail[]): V2WorkQueueStageStat[] {
  const counts: Record<string, number> = {};
  for (const status of V2_LEAD_STATUS_OPTIONS) {
    counts[status] = 0;
  }

  for (const lead of leads) {
    const status = normalizeV2LeadStatus(lead.consultation_status);
    if ((V2_LEAD_STATUS_OPTIONS as readonly string[]).includes(status)) {
      counts[status] += 1;
    }
  }

  return V2_WORK_QUEUE_STAGES.map(({ id, status, color }) => ({
    stage: id,
    label: status,
    status,
    count: counts[status] ?? 0,
    color,
  }));
}

/** @deprecated V2WorkQueueStageStat 사용 */
export type V2BottleneckStat = V2WorkQueueStageStat;

/** @deprecated computeV2WorkQueueStats 사용 */
export function computeV2BottleneckStats(leads: LeadDetail[]): V2WorkQueueStageStat[] {
  return computeV2WorkQueueStats(leads);
}
