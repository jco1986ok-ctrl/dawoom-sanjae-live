"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Building2,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import type { UnifiedManagementData } from "@/lib/load-unified-management-data";
import {
  type DashboardTestRole,
  DASHBOARD_TEST_ROLES,
  canUseDashboardRoleTest,
  getDashboardPermissions,
  getReferralTreeScopeMode,
  resolveSimulatedViewerContext,
  testRoleToViewerRole,
  TEST_ROLE_LABEL,
} from "@/lib/dashboard-rbac";
import {
  filterLeadsForAnalytics,
  getAnalyticsViewTier,
} from "@/lib/analytics-cockpit";
import { PartnerNetworkSections } from "@/app/dashboard/_components/PartnerNetworkSections";
import AdminPdfCalibrateButton from "@/app/dashboard/admin/_components/AdminPdfCalibrateButton";
import V2OverviewPanel from "./V2OverviewPanel";
import V2CustomerCollaborationSection from "./V2CustomerCollaborationSection";
import V2DailyBriefingModal from "./V2DailyBriefingModal";
import V2MyBoardTabPanel from "./V2MyBoardTabPanel";
import { V2_PAGE_BG, v2SurfaceCard } from "../_lib/v2-ui";
import { cn } from "@/lib/utils";

type TabId = "overview" | "customers" | "partners" | "myboard";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "종합 요약", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "customers", label: "고객(DB) 상담 관리", icon: <FileText className="w-4 h-4" /> },
  { id: "partners", label: "파트너 조직 관리", icon: <Building2 className="w-4 h-4" /> },
  { id: "myboard", label: "내 업무 보드", icon: <ClipboardList className="w-4 h-4" /> },
];

interface Props {
  data: UnifiedManagementData;
  viewerId: string;
  defaultTestRole: DashboardTestRole;
  pageBadge: string;
  pageTitle: string;
  pageSubtitle: string;
}

export default function V2UnifiedManagementDashboard({
  data,
  viewerId,
  defaultTestRole,
  pageBadge,
  pageTitle,
  pageSubtitle,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const canUseRoleTest = canUseDashboardRoleTest(defaultTestRole);
  const [testRole, setTestRole] = useState<DashboardTestRole>(defaultTestRole);
  const currentUserRole = canUseRoleTest ? testRole : defaultTestRole;

  const permissions = getDashboardPermissions(currentUserRole);
  const viewerRole = testRoleToViewerRole(currentUserRole);
  const analyticsTier = getAnalyticsViewTier(currentUserRole);

  const {
    leads,
    enrichedUsers,
    referralTreeRoots,
    referralTreeForest,
    statusMeta: _statusMeta,
    adminAgentId,
    parentPartnerOptions,
  } = data;

  const simulation = useMemo(
    () =>
      resolveSimulatedViewerContext(
        currentUserRole,
        viewerId,
        defaultTestRole,
        enrichedUsers,
      ),
    [currentUserRole, viewerId, defaultTestRole, enrichedUsers],
  );

  const displayLeads = useMemo(
    () =>
      filterLeadsForAnalytics(
        leads,
        analyticsTier,
        simulation.effectiveViewerId,
        currentUserRole,
        enrichedUsers,
      ),
    [leads, analyticsTier, simulation.effectiveViewerId, currentUserRole, enrichedUsers],
  );

  const overviewStats = useMemo(() => {
    const source = analyticsTier === "executive" ? leads : displayLeads;
    const statusCount: Record<string, number> = {};
    for (const lead of source) {
      const s = lead.consultation_status;
      statusCount[s] = (statusCount[s] ?? 0) + 1;
    }
    return { statusCount };
  }, [analyticsTier, leads, displayLeads]);

  const intakeAgentId = useMemo(() => {
    const user = enrichedUsers.find((u) => u.id === simulation.effectiveViewerId);
    return user?.agent_id ?? adminAgentId;
  }, [enrichedUsers, simulation.effectiveViewerId, adminAgentId]);

  const canAssign = permissions.canAssignLead;

  return (
    <div className={cn("min-h-screen", V2_PAGE_BG)}>
      <V2DailyBriefingModal
        leads={displayLeads}
        viewerUserId={simulation.effectiveViewerId}
        currentUserRole={currentUserRole}
      />
      <div className="bg-[#0f2d5e] pt-8 pb-10">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-blue-300 text-sm font-medium mb-1">{pageBadge}</p>
              <h1 className="text-white text-2xl font-black">{pageTitle}</h1>
              <p className="text-blue-200 text-sm mt-1">{pageSubtitle}</p>
            </div>

            <div className="shrink-0 self-start sm:self-auto flex flex-col items-stretch sm:items-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("myboard")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                  bg-white text-[#0f2d5e] shadow-md hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                내 업무 보드
              </button>
              {canUseRoleTest && <AdminPdfCalibrateButton />}
              {canUseRoleTest && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                    현재 직책 테스트
                  </span>
                  <div className="relative">
                    <select
                      value={testRole}
                      onChange={(e) => setTestRole(e.target.value as DashboardTestRole)}
                      className="appearance-none text-sm font-semibold pl-3 pr-9 py-2 rounded-xl
                      bg-white/10 text-white border border-white/20 backdrop-blur-sm
                      hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 cursor-pointer"
                      aria-label="현재 직책 테스트"
                    >
                      {DASHBOARD_TEST_ROLES.map((role) => (
                        <option key={role} value={role} className="text-slate-900 bg-white">
                          {TEST_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-blue-200 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 pb-10 flex flex-col gap-6 w-full min-w-0">
        {canUseRoleTest && simulation.isSimulating && simulation.simulationLabel && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
            role="status"
          >
            <FlaskConical className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 text-sm">
              <p className="font-bold">직책 테스트 모드</p>
              <p className="text-amber-800/90 mt-0.5 break-keep">
                {simulation.simulationLabel} 화면으로 미리보기 중입니다. 저장·권한 변경은 실제
                로그인 계정({TEST_ROLE_LABEL[defaultTestRole]}) 기준으로 동작합니다.
              </p>
            </div>
          </div>
        )}

        <div className={cn(v2SurfaceCard(), "p-1.5 flex flex-wrap gap-1.5")}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "bg-[#0f2d5e] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <V2OverviewPanel
            leads={leads}
            displayLeads={displayLeads}
            users={enrichedUsers}
            statusCount={overviewStats.statusCount}
            intakeAgentId={intakeAgentId}
            currentUserRole={currentUserRole}
            canViewFinancialData={permissions.canViewFinancialData}
          />
        )}

        {activeTab === "customers" && (
          <div className={cn(v2SurfaceCard(), "overflow-hidden min-w-0")}>
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">접수된 고객(DB) 관리</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {permissions.canChangeLeadStatus || permissions.canWriteConsultMemo
                    ? "진행 상태 변경 · 처리 담당자 배정 · 상담 메모"
                    : "본인 유입 건만 열람 — 상태·배정·재무 정보는 표시되지 않습니다"}
                </p>
              </div>
              {!permissions.canChangeLeadStatus && !permissions.canWriteConsultMemo && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full shrink-0">
                  READ ONLY
                </span>
              )}
            </div>
            <V2CustomerCollaborationSection
              leads={displayLeads}
              users={enrichedUsers}
              viewerUserId={simulation.effectiveViewerId}
              assignedTo={analyticsTier === "staff" ? simulation.effectiveViewerId : undefined}
              clientRefetch={analyticsTier === "executive" || analyticsTier === "partner"}
              viewerRole={viewerRole}
              currentUserRole={currentUserRole}
              canChangeStatus={permissions.canChangeLeadStatus}
              canWriteMemo={permissions.canWriteConsultMemo}
              canDelete={permissions.canDeleteLeads}
              canAssign={canAssign}
            />
          </div>
        )}

        {activeTab === "partners" && (
          <PartnerNetworkSections
            referralTreeRoots={referralTreeRoots}
            referralTreeForest={referralTreeForest}
            enrichedUsers={enrichedUsers}
            viewerRole={viewerRole as UserRole}
            viewerId={simulation.effectiveViewerId}
            treeScope={getReferralTreeScopeMode(currentUserRole)}
            readOnlyRoles={!permissions.canEditPartnerRoles}
            canChangePartnerLineage={permissions.canChangePartnerLineage}
            canDeleteUsers={permissions.canDeleteUsers}
            parentPartnerOptions={parentPartnerOptions}
            headerAction={null}
          />
        )}

        {activeTab === "myboard" && (
          <V2MyBoardTabPanel
            leads={leads}
            users={enrichedUsers}
            viewerUserId={simulation.effectiveViewerId}
          />
        )}
      </div>
    </div>
  );
}
