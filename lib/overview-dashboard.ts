import type { LeadDetail } from "@/lib/lead-detail";
import { resolveLeadFeeAmount } from "@/lib/lead-fee";

export type StatusGroupId = "sales" | "operations" | "review" | "delay";

export type StatusGroupDef = {
  id: StatusGroupId;
  label: string;
  subtitle: string;
  statuses: string[];
  cardClass: string;
  countClass: string;
  badgeClass: string;
};

export const OVERVIEW_STATUS_GROUPS: StatusGroupDef[] = [
  {
    id: "sales",
    label: "영업",
    subtitle: "신규 유입 · 상담 진행",
    statuses: ["신규", "상담중", "연락대기"],
    cardClass: "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200",
    countClass: "text-sky-800",
    badgeClass: "bg-sky-100 text-sky-700",
  },
  {
    id: "operations",
    label: "실무",
    subtitle: "계약 · 서류 취합",
    statuses: ["계약완료", "서류준비중"],
    cardClass: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
    countClass: "text-amber-900",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  {
    id: "review",
    label: "심사",
    subtitle: "공단 심사 · 승인 결과",
    statuses: ["공단접수(심사중)", "산재승인(완료)", "불승인(재심사)"],
    cardClass: "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200",
    countClass: "text-indigo-900",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
  {
    id: "delay",
    label: "지연 경고",
    subtitle: "즉시 조치 필요",
    statuses: ["부재중", "보류", "종결(수임불가)"],
    cardClass: "bg-gradient-to-br from-red-50 to-rose-100 border-red-300 ring-1 ring-red-200",
    countClass: "text-red-700",
    badgeClass: "bg-red-100 text-red-800",
  },
];

export type StatusGroupSummary = StatusGroupDef & {
  total: number;
  breakdown: { status: string; count: number }[];
};

export function computeStatusGroupSummaries(
  statusCount: Record<string, number>,
): StatusGroupSummary[] {
  return OVERVIEW_STATUS_GROUPS.map((group) => {
    const breakdown = group.statuses
      .map((status) => ({ status, count: statusCount[status] ?? 0 }))
      .filter((b) => b.count > 0);
    const total = group.statuses.reduce((sum, s) => sum + (statusCount[s] ?? 0), 0);
    return { ...group, total, breakdown };
  });
}

function isThisMonth(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const CONTRACTED_STATUSES = new Set([
  "계약완료",
  "서류준비중",
  "공단접수(심사중)",
  "산재승인(완료)",
  "불승인(재심사)",
]);

export type MonthlyFinancialSummary = {
  totalFeeAmount: number;
  monthLeadCount: number;
  feeCaseCount: number;
  contractedCount: number;
  approvedCount: number;
  approvedFeeAmount: number;
};

export function computeMonthlyFinancialSummary(leads: LeadDetail[]): MonthlyFinancialSummary {
  let totalFeeAmount = 0;
  let monthLeadCount = 0;
  let feeCaseCount = 0;
  let contractedCount = 0;
  let approvedCount = 0;
  let approvedFeeAmount = 0;

  for (const lead of leads) {
    if (!isThisMonth(lead.created_at)) continue;
    monthLeadCount += 1;

    const fee = resolveLeadFeeAmount(lead);
    if (fee > 0) {
      feeCaseCount += 1;
      totalFeeAmount += fee;
    }

    if (CONTRACTED_STATUSES.has(lead.consultation_status)) {
      contractedCount += 1;
    }
    if (lead.consultation_status === "산재승인(완료)") {
      approvedCount += 1;
      approvedFeeAmount += fee;
    }
  }

  return {
    totalFeeAmount,
    monthLeadCount,
    feeCaseCount,
    contractedCount,
    approvedCount,
    approvedFeeAmount,
  };
}
