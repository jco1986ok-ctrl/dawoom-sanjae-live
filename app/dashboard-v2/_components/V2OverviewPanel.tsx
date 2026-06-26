"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { getV2OverviewHeaderCopy } from "@/lib/v2-overview-audience";
import { getV2LeadStatusLabel } from "@/lib/v2-lead-status";
import { isLeadAgingStale } from "@/lib/v2-task-aging";
import { formatLeadDiseaseDisplay } from "@/lib/form-array-fields";
import {
  sortLeadsByRecency,
  V2_OVERVIEW_TAB_IDS,
  V2_OVERVIEW_TAB_LABELS,
} from "@/lib/v2-overview-tabs";
import {
  computeV2WorkQueueStats,
  computeV2MainSummaryCards,
} from "@/lib/v2-overview-summary";
import { useV2OverviewHashTab } from "./use-v2-overview-hash-tab";
import V2OverviewTabPanels from "./V2OverviewTabPanels";
import V2SummaryCards from "./V2SummaryCards";
import V2WorkQueueStats from "./V2WorkQueueStats";
import V2OverviewLinkSection from "./V2OverviewLinkSection";
import { v2SurfaceCard } from "../_lib/v2-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  leads: LeadDetail[];
  displayLeads: LeadDetail[];
  users: AdminUserListItem[];
  statusCount: Record<string, number>;
  intakeAgentId: string;
  currentUserRole: DashboardTestRole;
}

function IntakeRow({ lead }: { lead: LeadDetail }) {
  const disease = formatLeadDiseaseDisplay(lead.notes, lead.disease_name);
  const date = new Date(lead.created_at).toLocaleDateString("ko-KR");

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 min-w-0 hover:bg-slate-50/60 transition-colors">
      <p className="font-medium text-slate-900 text-sm truncate shrink-0 max-w-[28%] sm:max-w-[22%]">
        {lead.customer_name}
      </p>
      <p className="text-[11px] text-slate-500 truncate whitespace-nowrap overflow-hidden min-w-0 flex-1">
        {disease}
      </p>
      <p className="text-[11px] text-slate-400 tabular-nums shrink-0 hidden md:block">{date}</p>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 whitespace-nowrap shrink-0 max-w-[30%] truncate">
        {getV2LeadStatusLabel(lead.consultation_status)}
      </span>
    </div>
  );
}

function FullHistorySection({ leads }: { leads: LeadDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortLeadsByRecency(leads), [leads]);

  return (
    <Card className={cn(v2SurfaceCard(), "gap-0 py-0")}>
      <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between gap-3 border-b border-gray-100">
        <div>
          <CardTitle className="text-sm font-semibold">상세 고객 이력</CardTitle>
          <CardDescription className="text-xs">전체 {sorted.length}건</CardDescription>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
            bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              펼치기
            </>
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] text-slate-500">
                <th className="px-4 py-2.5 font-medium">고객명</th>
                <th className="px-4 py-2.5 font-medium">질병명</th>
                <th className="px-4 py-2.5 font-medium">접수일</th>
                <th className="px-4 py-2.5 font-medium">상태</th>
                <th className="px-4 py-2.5 font-medium">추천인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                    {lead.customer_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">
                    {formatLeadDiseaseDisplay(lead.notes, lead.disease_name)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {getV2LeadStatusLabel(lead.consultation_status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-[120px]">
                    {lead.referral_source || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

export default function V2OverviewPanel({
  leads,
  displayLeads,
  users,
  statusCount,
  intakeAgentId,
  currentUserRole,
}: Props) {
  const headerCopy = getV2OverviewHeaderCopy(currentUserRole);
  const { activeTab, setHashTab } = useV2OverviewHashTab();
  const summaryCards = useMemo(
    () => computeV2MainSummaryCards(statusCount),
    [statusCount],
  );
  const workQueueStats = useMemo(
    () => computeV2WorkQueueStats(displayLeads),
    [displayLeads],
  );
  const spotlightLeads = useMemo(() => sortLeadsByRecency(displayLeads).slice(0, 5), [displayLeads]);

  const urgentCount = useMemo(
    () => statusCount["1차 전화상담 대기"] ?? statusCount["신규"] ?? 0,
    [statusCount],
  );
  const staleCount = useMemo(
    () => displayLeads.filter((lead) => isLeadAgingStale(lead)).length,
    [displayLeads],
  );

  return (
    <div className="grid gap-4">
      {/* 섹션 타이틀 */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{headerCopy.title}</p>
        <p className="text-[11px] text-slate-500">{headerCopy.subtitle}</p>
      </div>

      <V2OverviewLinkSection
        agentId={intakeAgentId}
        role={currentUserRole}
        urgentCount={urgentCount}
        staleCount={staleCount}
      />

      {/* KPI 카드 */}
      <V2SummaryCards cards={summaryCards} />

      {/* 업무 대기 + 최근 접수 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <V2WorkQueueStats stats={workQueueStats} />
        </div>

        <Card className={cn(v2SurfaceCard(), "lg:col-span-8 gap-0 py-0 h-full")}>
          <CardHeader className="px-5 pt-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">최근 접수</CardTitle>
              <CardDescription className="text-xs">최대 5건</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-1">
            {spotlightLeads.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-8 text-center">표시할 접수 건이 없습니다.</p>
            ) : (
              spotlightLeads.map((lead) => <IntakeRow key={lead.id} lead={lead} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* 상세 탭 */}
      <section aria-label="종합 요약 상세 탭" className="grid gap-4">
        <div
          className={cn(v2SurfaceCard(), "p-1 flex gap-1 overflow-x-auto")}
          role="tablist"
        >
          {V2_OVERVIEW_TAB_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              onClick={() => setHashTab(tabId)}
              className={cn(
                "flex-1 min-w-[max-content] px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
                activeTab === tabId
                  ? "bg-[#0f2d5e] text-white"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
              )}
            >
              {V2_OVERVIEW_TAB_LABELS[tabId]}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          <V2OverviewTabPanels tab={activeTab} leads={leads} users={users} />
        </div>
      </section>

      <FullHistorySection leads={displayLeads} />
    </div>
  );
}
