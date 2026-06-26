import type { LeadDetail } from "@/lib/lead-detail";
import { normalizeOwnerRole } from "@/lib/collaboration-workflow";

export type V2MainSummaryCardId = "sales_wait" | "docs_prep" | "agency" | "delay";

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
    id: "sales_wait",
    label: "영업 대기",
    subtitle: "신규 · 상담 · 연락 대기",
    statuses: ["신규", "상담중", "연락대기", "부재중"],
    cardClass: "bg-white",
    countClass: "text-sky-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "docs_prep",
    label: "서류 준비",
    subtitle: "계약 · 서류 취합",
    statuses: ["계약완료", "서류준비중"],
    cardClass: "bg-white",
    countClass: "text-amber-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "agency",
    label: "공단 접수",
    subtitle: "심사 · 재심사",
    statuses: ["공단접수(심사중)", "불승인(재심사)"],
    cardClass: "bg-white",
    countClass: "text-indigo-600",
    badgeClass: "bg-slate-100 text-slate-600",
  },
  {
    id: "delay",
    label: "지연 경고",
    subtitle: "보류 · 종결 — 즉시 조치",
    statuses: ["보류", "종결(수임불가)"],
    cardClass: "bg-red-50",
    countClass: "text-red-600",
    badgeClass: "bg-red-100/80 text-red-700",
  },
];

export type V2MainSummaryCardSummary = V2MainSummaryCard & {
  total: number;
  breakdown: { status: string; count: number }[];
};

export function computeV2MainSummaryCards(
  statusCount: Record<string, number>,
): V2MainSummaryCardSummary[] {
  return V2_MAIN_SUMMARY_CARDS.map((card) => {
    const breakdown = card.statuses
      .map((status) => ({ status, count: statusCount[status] ?? 0 }))
      .filter((b) => b.count > 0);
    const total = card.statuses.reduce((sum, s) => sum + (statusCount[s] ?? 0), 0);
    return { ...card, total, breakdown };
  });
}

export type V2WorkQueueStageId =
  | "consult_wait"
  | "docs_collect_wait"
  | "brief_wait"
  | "agency_wait";

export type V2WorkQueueStageStat = {
  stage: V2WorkQueueStageId;
  label: string;
  count: number;
  color: string;
};

const WORK_QUEUE_STAGES: {
  stage: V2WorkQueueStageId;
  label: string;
  color: string;
}[] = [
  { stage: "consult_wait", label: "1차 상담 대기", color: "hsl(217 91% 60%)" },
  { stage: "docs_collect_wait", label: "서류 징구 대기", color: "hsl(45 93% 47%)" },
  { stage: "brief_wait", label: "서면 작성 대기", color: "hsl(262 83% 58%)" },
  { stage: "agency_wait", label: "공단 접수 대기", color: "hsl(142 71% 45%)" },
];

const WORK_QUEUE_EXCLUDED = new Set([
  "산재승인(완료)",
  "종결(수임불가)",
  "종결",
  "보류",
]);

const CONSULT_WAIT_STATUSES = new Set(["신규", "부재중", "상담중", "연락대기"]);
const AGENCY_WAIT_STATUSES = new Set(["공단접수(심사중)", "불승인(재심사)"]);

/** 진행 상태 + 담당 단계 → 업무 대기 버킷 */
export function resolveV2WorkQueueStage(lead: LeadDetail): V2WorkQueueStageId | null {
  const status = lead.consultation_status;
  if (WORK_QUEUE_EXCLUDED.has(status)) return null;
  if (AGENCY_WAIT_STATUSES.has(status)) return "agency_wait";
  if (CONSULT_WAIT_STATUSES.has(status)) return "consult_wait";

  const owner = normalizeOwnerRole(lead.current_owner_role);
  if (owner === "attorney") return "brief_wait";
  if (owner === "field_manager") return "docs_collect_wait";
  if (status === "계약완료" || status === "서류준비중") return "docs_collect_wait";

  return "consult_wait";
}

export function computeV2WorkQueueStats(leads: LeadDetail[]): V2WorkQueueStageStat[] {
  const counts: Record<V2WorkQueueStageId, number> = {
    consult_wait: 0,
    docs_collect_wait: 0,
    brief_wait: 0,
    agency_wait: 0,
  };

  for (const lead of leads) {
    const stage = resolveV2WorkQueueStage(lead);
    if (stage) counts[stage] += 1;
  }

  return WORK_QUEUE_STAGES.map(({ stage, label, color }) => ({
    stage,
    label,
    count: counts[stage],
    color,
  }));
}

/** @deprecated V2WorkQueueStageStat 사용 */
export type V2BottleneckStat = V2WorkQueueStageStat;

/** @deprecated computeV2WorkQueueStats 사용 */
export function computeV2BottleneckStats(leads: LeadDetail[]): V2WorkQueueStageStat[] {
  return computeV2WorkQueueStats(leads);
}
