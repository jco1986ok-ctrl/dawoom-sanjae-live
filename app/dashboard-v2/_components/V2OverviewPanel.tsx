"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import CustomerIntakeLinkBanner from "@/app/dashboard/_components/CustomerIntakeLinkBanner";
import AdminMasterInviteButton from "@/app/dashboard/admin/_components/AdminMasterInviteButton";
import { formatLeadDiseaseDisplay } from "@/lib/form-array-fields";
import {
  sortLeadsByRecency,
  V2_OVERVIEW_TAB_IDS,
  V2_OVERVIEW_TAB_LABELS,
} from "@/lib/v2-overview-tabs";
import {
  computeV2BottleneckStats,
  computeV2MainSummaryCards,
} from "@/lib/v2-overview-summary";
import { useV2OverviewHashTab } from "./use-v2-overview-hash-tab";
import V2OverviewTabPanels from "./V2OverviewTabPanels";
import V2SummaryCards from "./V2SummaryCards";
import V2BottleneckStats from "./V2BottleneckStats";

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-slate-100 last:border-0 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 text-sm truncate">{lead.customer_name}</p>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">{disease}</p>
      </div>
      <p className="text-[11px] text-slate-400 tabular-nums shrink-0">{date}</p>
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#0f2d5e]/10 text-[#0f2d5e] whitespace-nowrap shrink-0">
        {lead.consultation_status}
      </span>
    </div>
  );
}

function FullHistorySection({ leads }: { leads: LeadDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortLeadsByRecency(leads), [leads]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">상세 고객 이력</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            전체 {sorted.length}건 · 필요 시에만 펼쳐 확인
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
            bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors min-h-[44px]"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              전체 이력 보기
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-bold">고객명</th>
                <th className="px-4 py-3 font-bold">질병명</th>
                <th className="px-4 py-3 font-bold">접수일</th>
                <th className="px-4 py-3 font-bold">상태</th>
                <th className="px-4 py-3 font-bold">추천인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {lead.customer_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                    {formatLeadDiseaseDisplay(lead.notes, lead.disease_name)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {lead.consultation_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">
                    {lead.referral_source || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
  const { activeTab, setHashTab } = useV2OverviewHashTab();
  const summaryCards = useMemo(
    () => computeV2MainSummaryCards(statusCount),
    [statusCount],
  );
  const bottleneckStats = useMemo(
    () => computeV2BottleneckStats(displayLeads),
    [displayLeads],
  );
  const spotlightLeads = useMemo(() => sortLeadsByRecency(displayLeads).slice(0, 5), [displayLeads]);

  return (
    <div className="flex flex-col gap-5">
      <CustomerIntakeLinkBanner agentId={intakeAgentId} />
      <AdminMasterInviteButton agentId={intakeAgentId} testRole={currentUserRole} />

      {/* [1단계] 상단 고정 — 핵심 수치 + 최근 접수 */}
      <section
        className="sticky top-0 z-20 -mx-0 rounded-2xl border border-slate-200/80 bg-slate-50/95 backdrop-blur-md shadow-sm"
        aria-label="종합 요약 핵심 영역"
      >
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <V2SummaryCards cards={summaryCards} />
          <V2BottleneckStats stats={bottleneckStats} />

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
              <TrendingUp className="w-4 h-4 text-[#0f2d5e]" />
              <h2 className="font-bold text-slate-800 text-sm">최근 접수 핵심 정보</h2>
              <span className="text-[10px] text-slate-400 ml-auto">최대 5건</span>
            </div>
            {spotlightLeads.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-8 text-center">표시할 접수 건이 없습니다.</p>
            ) : (
              spotlightLeads.map((lead) => <IntakeRow key={lead.id} lead={lead} />)
            )}
          </div>
        </div>
      </section>

      {/* [2단계] 해시 연동 탭 */}
      <section aria-label="종합 요약 상세 탭">
        <div
          className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-2 flex gap-1.5 overflow-x-auto"
          role="tablist"
        >
          {V2_OVERVIEW_TAB_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              onClick={() => setHashTab(tabId)}
              className={`flex-1 min-w-[max-content] min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap
                ${
                  activeTab === tabId
                    ? "bg-[#0f2d5e] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
            >
              {V2_OVERVIEW_TAB_LABELS[tabId]}
            </button>
          ))}
        </div>

        <div className="mt-4" role="tabpanel">
          <V2OverviewTabPanels tab={activeTab} leads={leads} users={users} />
        </div>
      </section>

      {/* [3단계] 접이식 전체 이력 */}
      <FullHistorySection leads={displayLeads} />
    </div>
  );
}
