"use client";

import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { shouldShowV2PartnerLinkHero } from "@/lib/v2-overview-audience";
import V2PartnerSalesLinkHero from "./V2PartnerSalesLinkHero";
import V2StaffLinkBar from "./V2StaffLinkBar";

interface Props {
  agentId: string;
  role: DashboardTestRole;
  urgentCount?: number;
  staleCount?: number;
}

/** 직책별 종합 요약 상단 — 모든 직책 링크 제공, 영업 파트너는 대형 히어로 */
export default function V2OverviewLinkSection({
  agentId,
  role,
  urgentCount,
  staleCount,
}: Props) {
  if (shouldShowV2PartnerLinkHero(role)) {
    return <V2PartnerSalesLinkHero agentId={agentId} />;
  }

  return (
    <V2StaffLinkBar
      agentId={agentId}
      urgentCount={urgentCount}
      staleCount={staleCount}
    />
  );
}
