import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import {
  computeChannelTrend,
  computePartnerLineStats,
  computePipelineFunnel,
  computeSubPartnerTop,
  computeTopPartners,
  filterLeadsForAnalytics,
  getAnalyticsViewTier,
  getRankMedal,
  type PipelineFunnel,
  type PartnerRankItem,
} from "@/lib/analytics-cockpit";
import { computeMonthlyFinancialSummary } from "@/lib/overview-dashboard";
import { formatKrw } from "@/lib/lead-fee";
import OverviewFunnelChart from "./OverviewFunnelChart";
import OverviewFinancialSummary from "./OverviewFinancialSummary";
import { ArrowRight, BarChart3, GitBranch, Trophy, Users } from "lucide-react";

interface Props {
  leads: LeadDetail[];
  users: AdminUserListItem[];
  viewerId: string;
  currentUserRole: DashboardTestRole;
}

function CockpitCard({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-w-0 ${className}`}
    >
      <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-50">
        <div className="w-9 h-9 rounded-xl bg-[#0f2d5e]/5 border border-[#0f2d5e]/10 flex items-center justify-center shrink-0 text-[#0f2d5e]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 break-keep">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** 파트너·노무사용 — 단계별 미니 카드 */
function PipelineStageCards({ funnel }: { funnel: PipelineFunnel }) {
  const stages = [
    { key: "new", label: "신규", count: funnel.newLeads, light: "bg-sky-50 text-sky-700" },
    { key: "consult", label: "상담/위임", count: funnel.consultDelegation, light: "bg-violet-50 text-violet-700" },
    { key: "review", label: "공단 심사", count: funnel.agencyReview, light: "bg-indigo-50 text-indigo-700" },
    { key: "approved", label: "산재 승인", count: funnel.approved, light: "bg-teal-50 text-teal-700" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stages.map((stage, i) => (
        <div key={stage.key} className="relative min-w-0">
          {i > 0 && (
            <ArrowRight className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10" />
          )}
          <div className={`rounded-xl px-3 py-3 ${stage.light} border border-white/80`}>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{stage.label}</p>
            <p className="text-2xl font-black tabular-nums mt-0.5">{stage.count}건</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopPartnersWidget({
  items,
  emptyLabel,
  showFee = false,
}: {
  items: PartnerRankItem[];
  emptyLabel: string;
  showFee?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/80 border border-slate-100"
        >
          <span className="text-lg shrink-0 w-8 text-center">{getRankMedal(item.rank)}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
            <p className="text-[11px] text-slate-400">
              이번 달 {item.count}건 매칭
              {showFee && item.feeTotal > 0 && (
                <span className="text-emerald-600 font-semibold ml-1">
                  · 예상 {formatKrw(item.feeTotal)}
                </span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-black text-[#0f2d5e] tabular-nums">{item.count}건</span>
            {showFee && (
              <p className="text-[11px] font-bold text-emerald-700 tabular-nums">
                {formatKrw(item.feeTotal)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChannelTrendWidget({ trend }: { trend: ReturnType<typeof computeChannelTrend> }) {
  return (
    <div className="space-y-5">
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
        {trend.directPct > 0 && (
          <div
            className="bg-cyan-500 transition-all duration-700"
            style={{ width: `${trend.directPct}%` }}
            title={`본사 다이렉트 ${trend.directPct}%`}
          />
        )}
        {trend.partnerPct > 0 && (
          <div
            className="bg-orange-400 transition-all duration-700"
            style={{ width: `${trend.partnerPct}%` }}
            title={`파트너 링크 ${trend.partnerPct}%`}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-cyan-50 border border-cyan-100 px-4 py-3">
          <p className="text-[11px] font-bold text-cyan-700">본사 다이렉트 링크</p>
          <p className="text-2xl font-black text-cyan-800 tabular-nums mt-1">{trend.directPct}%</p>
          <p className="text-[11px] text-cyan-600/80 mt-0.5">{trend.directCount}건</p>
        </div>
        <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
          <p className="text-[11px] font-bold text-orange-700">파트너 링크 유입</p>
          <p className="text-2xl font-black text-orange-800 tabular-nums mt-1">{trend.partnerPct}%</p>
          <p className="text-[11px] text-orange-600/80 mt-0.5">{trend.partnerCount}건</p>
        </div>
      </div>
    </div>
  );
}

function PartnerLineWidget({ stats }: { stats: ReturnType<typeof computePartnerLineStats> }) {
  const rate =
    stats.totalDb > 0 ? Math.round((stats.delegationDone / stats.totalDb) * 100) : 0;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-xl bg-gradient-to-br from-[#0f2d5e]/5 to-blue-50 border border-[#0f2d5e]/10 px-5 py-5">
        <p className="text-xs font-semibold text-slate-500">나의 누적 고객 매칭</p>
        <p className="text-3xl font-black text-[#0f2d5e] tabular-nums mt-1">{stats.totalDb}건</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 px-5 py-5">
        <p className="text-xs font-semibold text-slate-500">그중 위임 완료</p>
        <p className="text-3xl font-black text-emerald-700 tabular-nums mt-1">{stats.delegationDone}건</p>
        <p className="text-[11px] text-emerald-600/80 mt-1">위임률 {rate}%</p>
      </div>
    </div>
  );
}

export default function AnalyticsCockpit({
  leads,
  users,
  viewerId,
  currentUserRole,
}: Props) {
  const tier = getAnalyticsViewTier(currentUserRole);
  const scopedLeads = filterLeadsForAnalytics(leads, tier, viewerId, currentUserRole, users);
  const funnel = computePipelineFunnel(scopedLeads);

  if (tier === "staff") {
    return (
      <CockpitCard
        title="전체 진행 단계 현황"
        subtitle="실무 진행 단계별 현황"
        icon={<GitBranch className="w-4 h-4" />}
      >
        <PipelineStageCards funnel={funnel} />
      </CockpitCard>
    );
  }

  if (tier === "partner") {
    const lineStats = computePartnerLineStats(scopedLeads);
    const subTop = computeSubPartnerTop(leads, viewerId, currentUserRole, users, 3);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CockpitCard
          title="파트너 그룹 진행 현황"
          subtitle="소속 파트너 종합 고객 매칭 현황"
          icon={<BarChart3 className="w-4 h-4" />}
          className="lg:col-span-2"
        >
          <PartnerLineWidget stats={lineStats} />
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3">파트너 그룹 진행 단계</p>
            <PipelineStageCards funnel={funnel} />
          </div>
        </CockpitCard>

        <CockpitCard
          title="협력 파트너 TOP 3"
          subtitle="이번 달 고객 매칭 기여도"
          icon={<Users className="w-4 h-4" />}
          className="lg:col-span-2"
        >
          <TopPartnersWidget items={subTop} emptyLabel="이번 달 협력 파트너 매칭 건수가 없습니다." />
        </CockpitCard>
      </div>
    );
  }

  const topPartners = computeTopPartners(leads, users, 5, true);
  const financial = computeMonthlyFinancialSummary(leads);

  return (
    <div className="flex flex-col gap-4">
      <CockpitCard
        title="전환 퍼널"
        subtitle="유입 → 상담 · 위임 → 공단 심사 → 산재 승인"
        icon={<GitBranch className="w-4 h-4" />}
      >
        <OverviewFunnelChart funnel={funnel} />
      </CockpitCard>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <CockpitCard
          title="이달의 우수 파트너 TOP 5"
          subtitle="매칭 건수 · 예상 수임료 합계"
          icon={<Trophy className="w-4 h-4" />}
          className="lg:col-span-3"
        >
          <TopPartnersWidget
            items={topPartners}
            emptyLabel="이번 달 파트너 매칭 건수가 없습니다."
            showFee
          />
        </CockpitCard>

        <div className="lg:col-span-2 min-h-0">
          <OverviewFinancialSummary summary={financial} />
        </div>
      </div>
    </div>
  );
}
