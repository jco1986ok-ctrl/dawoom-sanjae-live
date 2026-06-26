/** V2 대시보드 — 업무 대기 6단계 (consultation_status 단일 체계) */
export const V2_LEAD_STATUS_OPTIONS = [
  "1차 전화상담 대기",
  "서류 취합 중",
  "현장방문 예정",
  "노무사 서면작성 대기",
  "공단접수 대기",
  "공단 심사/결과 대기",
] as const;

export type V2LeadStatus = (typeof V2_LEAD_STATUS_OPTIONS)[number];

export const V2_LEAD_STATUS_DEFAULT: V2LeadStatus = "1차 전화상담 대기";

export type V2WorkQueueStageId =
  | "phone_wait"
  | "docs_collect"
  | "field_visit"
  | "brief_wait"
  | "agency_submit"
  | "agency_review";

export const V2_WORK_QUEUE_STAGES: {
  id: V2WorkQueueStageId;
  status: V2LeadStatus;
  color: string;
}[] = [
  { id: "phone_wait", status: "1차 전화상담 대기", color: "hsl(217 91% 60%)" },
  { id: "docs_collect", status: "서류 취합 중", color: "hsl(45 93% 47%)" },
  { id: "field_visit", status: "현장방문 예정", color: "hsl(25 95% 53%)" },
  { id: "brief_wait", status: "노무사 서면작성 대기", color: "hsl(262 83% 58%)" },
  { id: "agency_submit", status: "공단접수 대기", color: "hsl(142 71% 45%)" },
  { id: "agency_review", status: "공단 심사/결과 대기", color: "hsl(199 89% 48%)" },
];

/** DB 레거시 값 → V2 6단계 (마이그레이션 전 읽기용) */
export const V2_LEGACY_STATUS_MAP: Record<string, V2LeadStatus> = {
  신규: "1차 전화상담 대기",
  부재중: "1차 전화상담 대기",
  상담중: "1차 전화상담 대기",
  연락대기: "1차 전화상담 대기",
  보류: "1차 전화상담 대기",
  계약완료: "서류 취합 중",
  서류준비중: "서류 취합 중",
  "공단접수(심사중)": "공단 심사/결과 대기",
  "불승인(재심사)": "공단 심사/결과 대기",
  "산재승인(완료)": "공단 심사/결과 대기",
  "종결(수임불가)": "공단 심사/결과 대기",
  종결: "공단 심사/결과 대기",
};

export const V2_LEAD_STATUS_SELECT_STYLE: Record<V2LeadStatus, string> = {
  "1차 전화상담 대기": "bg-sky-50 text-sky-700 border-sky-200",
  "서류 취합 중": "bg-amber-50 text-amber-800 border-amber-200",
  "현장방문 예정": "bg-orange-50 text-orange-800 border-orange-200",
  "노무사 서면작성 대기": "bg-violet-50 text-violet-700 border-violet-200",
  "공단접수 대기": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "공단 심사/결과 대기": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export const V2_LEAD_STATUS_BADGE_STYLE: Record<V2LeadStatus, string> = {
  "1차 전화상담 대기": "bg-sky-100 text-sky-800",
  "서류 취합 중": "bg-amber-100 text-amber-900",
  "현장방문 예정": "bg-orange-100 text-orange-800",
  "노무사 서면작성 대기": "bg-violet-100 text-violet-800",
  "공단접수 대기": "bg-emerald-100 text-emerald-800",
  "공단 심사/결과 대기": "bg-indigo-100 text-indigo-800",
};

export function isValidV2LeadStatus(status: string): status is V2LeadStatus {
  return (V2_LEAD_STATUS_OPTIONS as readonly string[]).includes(status);
}

export function normalizeV2LeadStatus(status: string): string {
  if (isValidV2LeadStatus(status)) return status;
  return V2_LEGACY_STATUS_MAP[status] ?? status;
}

export function getV2LeadStatusSelectClass(status: string): string {
  const normalized = normalizeV2LeadStatus(status);
  if (isValidV2LeadStatus(normalized)) {
    return V2_LEAD_STATUS_SELECT_STYLE[normalized];
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function getV2LeadStatusBadgeClass(status: string): string {
  const normalized = normalizeV2LeadStatus(status);
  if (isValidV2LeadStatus(normalized)) {
    return V2_LEAD_STATUS_BADGE_STYLE[normalized];
  }
  return "bg-slate-100 text-slate-600";
}

export function getV2LeadStatusLabel(status: string): string {
  return normalizeV2LeadStatus(status);
}
