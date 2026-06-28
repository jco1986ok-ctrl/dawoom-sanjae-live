import { normalizeV2LeadStatus } from "@/lib/v2-lead-status";

export type V2CustomerQuickFilterId =
  | "all"
  | "unassigned"
  | "phone"
  | "docs_field"
  | "brief"
  | "agency";

export const V2_CUSTOMER_QUICK_FILTERS: { id: V2CustomerQuickFilterId; label: string }[] = [
  { id: "all", label: "전체 보기" },
  { id: "unassigned", label: "👤 처리 담당자 미배정" },
  { id: "phone", label: "📞 1차 전화상담" },
  { id: "docs_field", label: "📋 서류·현장" },
  { id: "brief", label: "✍️ 서면 작성" },
  { id: "agency", label: "🏢 공단" },
];

export function matchesV2CustomerQuickFilter(
  status: string,
  filterId: V2CustomerQuickFilterId,
  options?: { assignedUserId?: string | null },
): boolean {
  const s = normalizeV2LeadStatus(status);
  switch (filterId) {
    case "all":
      return true;
    case "unassigned":
      return !options?.assignedUserId;
    case "phone":
      return s === "1차 전화상담 대기";
    case "docs_field":
      return s === "서류 취합 중" || s === "현장방문 예정";
    case "brief":
      return s === "노무사 서면작성 대기";
    case "agency":
      return s === "공단접수 대기" || s === "공단 심사/결과 대기";
    default:
      return true;
  }
}
