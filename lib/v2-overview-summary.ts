import type { LeadDetail } from "@/lib/lead-detail";
import {
  COLLABORATION_OWNER_LABELS,
  normalizeOwnerRole,
  type CollaborationOwnerRole,
} from "@/lib/collaboration-workflow";

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

export type V2BottleneckStat = {
  role: CollaborationOwnerRole;
  label: string;
  count: number;
  barClass: string;
};

const BOTTLENECK_BAR: Record<CollaborationOwnerRole, string> = {
  inside_staff: "bg-sky-500",
  field_manager: "bg-amber-500",
  attorney: "bg-violet-500",
};

export function computeV2BottleneckStats(leads: LeadDetail[]): V2BottleneckStat[] {
  const counts: Record<CollaborationOwnerRole, number> = {
    inside_staff: 0,
    field_manager: 0,
    attorney: 0,
  };

  for (const lead of leads) {
    if (lead.consultation_status === "산재승인(완료)") continue;
    const role = normalizeOwnerRole(lead.current_owner_role);
    counts[role] += 1;
  }

  return (["inside_staff", "field_manager", "attorney"] as const).map((role) => ({
    role,
    label: COLLABORATION_OWNER_LABELS[role],
    count: counts[role],
    barClass: BOTTLENECK_BAR[role],
  }));
}
