import type { DashboardTestRole } from "@/lib/dashboard-rbac";

/** 종합 요약 상단 — 링크 히어로를 크게 보여줄 영업(파트너) 직책 */
export const V2_SALES_PARTNER_ROLES: readonly DashboardTestRole[] = [
  "공식파트너",
  "제휴파트너",
] as const;

/** 링크 공유가 덜 중요한 내근·실무 직책 */
export const V2_INTERNAL_STAFF_ROLES: readonly DashboardTestRole[] = [
  "마스터",
  "총괄파트너",
  "대표노무사",
  "노무사",
  "일반팀원",
] as const;

export type V2OverviewAudience = "sales_partner" | "internal_staff";

export function getV2OverviewAudience(role: DashboardTestRole): V2OverviewAudience {
  if ((V2_SALES_PARTNER_ROLES as readonly string[]).includes(role)) {
    return "sales_partner";
  }
  return "internal_staff";
}

export function shouldShowV2PartnerLinkHero(role: DashboardTestRole): boolean {
  return getV2OverviewAudience(role) === "sales_partner";
}

export function getV2OverviewHeaderCopy(role: DashboardTestRole): {
  title: string;
  subtitle: string;
} {
  if (shouldShowV2PartnerLinkHero(role)) {
    return {
      title: "영업 현황",
      subtitle: "고객·동료 링크 공유 후 접수 퍼널을 확인하세요",
    };
  }

  const byRole: Partial<Record<DashboardTestRole, string>> = {
    마스터: "전체 접수 · 업무 대기 · 병목을 한눈에",
    총괄파트너: "조직 접수 · 업무 대기 · 병목을 한눈에",
    대표노무사: "배당 사건 · 업무 대기 · 최근 접수",
    노무사: "내 담당 사건 · 업무 대기 · 최근 접수",
    일반팀원: "내 할 일 · 업무 대기 · 최근 접수",
  };

  return {
    title: "종합 요약",
    subtitle: byRole[role] ?? "업무 대기 · 최근 접수 한눈에",
  };
}
