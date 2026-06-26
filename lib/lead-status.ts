/** 산재 실무 진행 상태 (고객 DB 상담 관리 기본 옵션) */
export const LEAD_STATUS_PENDING = "보류" as const;

/** @deprecated 코드에서는 LEAD_STATUS_PENDING 사용 권장 — DB·UI 표시값은 한글 '보류' */
export const LEAD_STATUS_CODE = {
  PENDING: LEAD_STATUS_PENDING,
} as const;

export const LEAD_STATUS_OPTIONS = [
  "신규",
  "부재중",
  "상담중",
  LEAD_STATUS_PENDING,
  "계약완료",
  "서류준비중",
  "공단접수(심사중)",
  "산재승인(완료)",
  "불승인(재심사)",
  "종결(수임불가)",
] as const;

export type LeadStatusOption = (typeof LEAD_STATUS_OPTIONS)[number];

/** DB에 남아 있을 수 있는 이전 상태값 */
export const LEGACY_LEAD_STATUSES = ["연락대기", "종결"] as const;

export type LegacyLeadStatus = (typeof LEGACY_LEAD_STATUSES)[number];

export type AnyLeadStatus = LeadStatusOption | LegacyLeadStatus;

export const ALL_VALID_LEAD_STATUSES = [
  ...LEAD_STATUS_OPTIONS,
  ...LEGACY_LEAD_STATUSES,
] as const;

/** Select·Badge 공통 색상 (border 포함) */
export const LEAD_STATUS_SELECT_STYLE: Record<string, string> = {
  신규: "bg-sky-50 text-sky-700 border-sky-200",
  부재중: "bg-orange-50 text-orange-700 border-orange-200",
  상담중: "bg-violet-50 text-violet-700 border-violet-200",
  보류: "bg-orange-50 text-orange-800 border-orange-200",
  계약완료: "bg-emerald-50 text-emerald-700 border-emerald-200",
  서류준비중: "bg-amber-50 text-amber-800 border-amber-200",
  "공단접수(심사중)": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "산재승인(완료)": "bg-teal-50 text-teal-700 border-teal-200",
  "불승인(재심사)": "bg-rose-50 text-rose-700 border-rose-200",
  "종결(수임불가)": "bg-slate-100 text-slate-600 border-slate-200",
  // legacy
  연락대기: "bg-orange-50 text-orange-600 border-orange-200",
  종결: "bg-slate-100 text-slate-500 border-slate-200",
};

export const LEAD_STATUS_BADGE_STYLE: Record<string, string> = {
  신규: "bg-sky-100 text-sky-800",
  부재중: "bg-orange-100 text-orange-800",
  상담중: "bg-violet-100 text-violet-800",
  보류: "bg-orange-100 text-orange-800",
  계약완료: "bg-emerald-100 text-emerald-800",
  서류준비중: "bg-amber-100 text-amber-900",
  "공단접수(심사중)": "bg-indigo-100 text-indigo-800",
  "산재승인(완료)": "bg-teal-100 text-teal-800",
  "불승인(재심사)": "bg-rose-100 text-rose-800",
  "종결(수임불가)": "bg-slate-200 text-slate-700",
  연락대기: "bg-orange-100 text-orange-700",
  종결: "bg-slate-100 text-slate-600",
};

export function getLeadStatusSelectClass(status: string): string {
  return LEAD_STATUS_SELECT_STYLE[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export function getLeadStatusBadgeClass(status: string): string {
  return LEAD_STATUS_BADGE_STYLE[status] ?? "bg-slate-100 text-slate-600";
}

export function isValidLeadStatus(status: string): status is AnyLeadStatus {
  return (ALL_VALID_LEAD_STATUSES as readonly string[]).includes(status);
}

/** 고객 DB 상담 관리 — 퀵 필터 */
export type CustomerQuickFilterId =
  | "all"
  | "urgent"
  | "docs"
  | "review"
  | "approved";

export const CUSTOMER_QUICK_FILTERS: {
  id: CustomerQuickFilterId;
  label: string;
}[] = [
  { id: "all", label: "전체 보기" },
  { id: "urgent", label: "🚨 신규/부재중 (빠른콜 필요)" },
  { id: "docs", label: "⏳ 서류준비중" },
  { id: "review", label: "🏢 공단 심사중" },
  { id: "approved", label: "🎉 산재 승인" },
];

const URGENT_STATUSES = new Set<string>(["신규", "부재중", "연락대기"]);

export function matchesCustomerQuickFilter(
  status: string,
  filterId: CustomerQuickFilterId,
): boolean {
  switch (filterId) {
    case "all":
      return true;
    case "urgent":
      return URGENT_STATUSES.has(status);
    case "docs":
      return status === "서류준비중";
    case "review":
      return status === "공단접수(심사중)";
    case "approved":
      return status === "산재승인(완료)";
    default:
      return true;
  }
}

/** 종합 요약 탭 — 상태별 집계용 */
export const OVERVIEW_STATUS_META: { key: LeadStatusOption; color: string; bg: string }[] = [
  { key: "신규", color: "text-sky-700", bg: "bg-sky-50" },
  { key: "부재중", color: "text-orange-700", bg: "bg-orange-50" },
  { key: "상담중", color: "text-violet-700", bg: "bg-violet-50" },
  { key: LEAD_STATUS_PENDING, color: "text-orange-800", bg: "bg-orange-50" },
  { key: "계약완료", color: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "서류준비중", color: "text-amber-800", bg: "bg-amber-50" },
  { key: "공단접수(심사중)", color: "text-indigo-700", bg: "bg-indigo-50" },
  { key: "산재승인(완료)", color: "text-teal-700", bg: "bg-teal-50" },
  { key: "불승인(재심사)", color: "text-rose-700", bg: "bg-rose-50" },
  { key: "종결(수임불가)", color: "text-slate-600", bg: "bg-slate-100" },
];

export const CUSTOMER_TABLE_PAGE_SIZE = 15;
