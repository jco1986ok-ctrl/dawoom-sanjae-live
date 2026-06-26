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
    cardClass: "bg-gradient-to-br from-sky-50 to-blue-100 border-sky-200",
    countClass: "text-sky-900",
    badgeClass: "bg-sky-100 text-sky-800",
  },
  {
    id: "docs_prep",
    label: "서류 준비",
    subtitle: "계약 · 서류 취합",
    statuses: ["계약완료", "서류준비중"],
    cardClass: "bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200",
    countClass: "text-amber-950",
    badgeClass: "bg-amber-100 text-amber-900",
  },
  {
    id: "agency",
    label: "공단 접수",
    subtitle: "심사 · 재심사",
    statuses: ["공단접수(심사중)", "불승인(재심사)"],
    cardClass: "bg-gradient-to-br from-indigo-50 to-violet-100 border-indigo-200",
    countClass: "text-indigo-950",
    badgeClass: "bg-indigo-100 text-indigo-900",
  },
  {
    id: "delay",
    label: "지연 경고",
    subtitle: "보류 · 종결 — 즉시 조치",
    statuses: ["보류", "종결(수임불가)"],
    cardClass: "bg-gradient-to-br from-red-50 to-rose-100 border-red-300 ring-1 ring-red-200",
    countClass: "text-red-700",
    badgeClass: "bg-red-100 text-red-800",
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
