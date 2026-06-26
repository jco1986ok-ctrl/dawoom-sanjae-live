import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

export type V2LeadStatusGroupId = "sales" | "docs" | "agency";

export type V2LeadStatusGroup = {
  id: V2LeadStatusGroupId;
  label: string;
  statuses: readonly string[];
};

/** V2 상세 모달 — optgroup 3분류 */
export const V2_LEAD_STATUS_GROUPS: V2LeadStatusGroup[] = [
  {
    id: "sales",
    label: "영업",
    statuses: ["신규", "부재중", "상담중", "보류", "연락대기"],
  },
  {
    id: "docs",
    label: "서류 징구",
    statuses: ["계약완료", "서류준비중"],
  },
  {
    id: "agency",
    label: "공단 심사",
    statuses: ["공단접수(심사중)", "불승인(재심사)", "산재승인(완료)", "종결(수임불가)"],
  },
];

export function getV2GroupedStatusOptions(currentValue: string): {
  groups: V2LeadStatusGroup[];
  orphanStatuses: string[];
} {
  const grouped = new Set(V2_LEAD_STATUS_GROUPS.flatMap((g) => g.statuses));
  const orphans: string[] = [];

  if (currentValue && !grouped.has(currentValue)) {
    orphans.push(currentValue);
  }

  for (const status of LEAD_STATUS_OPTIONS) {
    if (!grouped.has(status) && status !== currentValue) {
      orphans.push(status);
    }
  }

  return {
    groups: V2_LEAD_STATUS_GROUPS,
    orphanStatuses: [...new Set(orphans)],
  };
}
