"use client";

import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { shouldShowV2PartnerLinkHero } from "@/lib/v2-overview-audience";
import V2PartnerSalesLinkHero from "./V2PartnerSalesLinkHero";
import V2InternalOverviewBrief from "./V2InternalOverviewBrief";

interface Props {
  agentId: string;
  role: DashboardTestRole;
  urgentCount?: number;
  staleCount?: number;
}

/** 직책별 종합 요약 상단 — 영업 파트너: 링크 히어로 / 내근: 업무 안내 */
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
    <V2InternalOverviewBrief
      role={role}
      urgentCount={urgentCount}
      staleCount={staleCount}
    />
  );
}
