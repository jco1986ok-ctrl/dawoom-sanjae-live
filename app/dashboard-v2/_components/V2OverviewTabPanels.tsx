"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import { getV2LeadStatusLabel } from "@/lib/v2-lead-status";
import type { AdminUserListItem } from "@/lib/user-lineage";
import FAQAccordion from "@/app/dashboard/_components/FAQAccordion";
import OverviewFunnelChart from "@/app/dashboard/_components/OverviewFunnelChart";
import OverviewFinancialSummary from "@/app/dashboard/_components/OverviewFinancialSummary";
import {
  computePipelineFunnel,
  computeTopPartners,
  getRankMedal,
} from "@/lib/analytics-cockpit";
import { computeMonthlyFinancialSummary } from "@/lib/overview-dashboard";
import { formatKrw } from "@/lib/lead-fee";
import { formatLeadDiseaseDisplay } from "@/lib/form-array-fields";
import { parseConsultTimeline } from "@/lib/lead-consult-memos";
import type { V2OverviewTabId } from "@/lib/v2-overview-tabs";
import { v2SurfaceCard } from "../_lib/v2-ui";
import { cn } from "@/lib/utils";

interface Props {
  tab: V2OverviewTabId;
  leads: LeadDetail[];
  users: AdminUserListItem[];
  canViewFinancialData?: boolean;
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
    <div className={cn(v2SurfaceCard(), "overflow-hidden min-w-0", className)}>
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
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

function SummaryTab({ leads }: { leads: LeadDetail[] }) {
  const timeline = useMemo(() => {
    const items: {
      id: string;
      leadName: string;
      date: string;
      author: string;
      text: string;
      kind: "memo" | "status";
    }[] = [];

    for (const lead of leads) {
      for (const entry of parseConsultTimeline(lead.notes)) {
        items.push({
          id: `${lead.id}-${entry.id}`,
          leadName: lead.customer_name,
          date: entry.date,
          author: entry.author,
          text: entry.text,
          kind: entry.kind,
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }, [leads]);

  const recentIntakeSummary = useMemo(() => {
    const recent = [...leads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    if (recent.length === 0) return "최근 접수 건이 없습니다.";
    return recent
      .map(
        (l) =>
          `${l.customer_name}(${formatLeadDiseaseDisplay(l.notes, l.disease_name)}, ${getV2LeadStatusLabel(l.consultation_status)})`,
      )
      .join(" · ");
  }, [leads]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
              AI 상담 요약 (베타)
            </p>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed break-keep">
              <Bot className="w-4 h-4 inline-block mr-1 text-violet-500 -mt-0.5" />
              최근 접수 {leads.length}건 기준 — {recentIntakeSummary}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              V2 샌드박스 전용 미리보기입니다. 정식 AI 요약 API 연동은 추후 반영 예정입니다.
            </p>
          </div>
        </div>
      </div>

      <CockpitCard
        title="상담 이력"
        subtitle="노무사 메모 · 상태 변경 타임라인 (최근 30건)"
        icon={<MessageSquare className="w-4 h-4" />}
      >
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">등록된 상담 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {timeline.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-slate-800">{item.leadName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      item.kind === "status"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.author}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {new Date(item.date).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1.5 break-keep">{item.text}</p>
              </li>
            ))}
          </ul>
        )}
      </CockpitCard>
    </div>
  );
}

function FinanceTab({ leads }: { leads: LeadDetail[] }) {
  const funnel = useMemo(() => computePipelineFunnel(leads), [leads]);
  const financial = useMemo(() => computeMonthlyFinancialSummary(leads), [leads]);

  return (
    <div className="flex flex-col gap-4">
      <CockpitCard
        title="전환 퍼널"
        subtitle="유입 → 상담 · 위임 → 공단 심사 → 산재 승인"
        icon={<GitBranch className="w-4 h-4" />}
      >
        <OverviewFunnelChart funnel={funnel} />
      </CockpitCard>
      <OverviewFinancialSummary summary={financial} />
    </div>
  );
}

function TeamTab({
  leads,
  users,
  canViewFinancialData = true,
}: {
  leads: LeadDetail[];
  users: AdminUserListItem[];
  canViewFinancialData?: boolean;
}) {
  const topPartners = useMemo(() => computeTopPartners(leads, users, 5, true), [leads, users]);

  const recentReferrals = useMemo(
    () =>
      [...leads]
        .filter((l) => l.referral_source?.trim())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10),
    [leads],
  );

  return (
    <div className="flex flex-col gap-4">
      <CockpitCard
        title="이달의 우수 파트너 TOP 5"
        subtitle={canViewFinancialData ? "매칭 건수 · 예상 수임료 합계" : "매칭 건수"}
        icon={<Trophy className="w-4 h-4" />}
      >
        {topPartners.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            이번 달 파트너 매칭 건수가 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {topPartners.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50/80 border border-slate-100"
              >
                <span className="text-lg shrink-0 w-8 text-center">{getRankMedal(item.rank)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-400">
                    이번 달 {item.count}건 매칭
                    {canViewFinancialData && item.feeTotal > 0 && (
                      <span className="text-emerald-600 font-semibold ml-1">
                        · 예상 {formatKrw(item.feeTotal)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-[#0f2d5e] tabular-nums">
                    {item.count}건
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CockpitCard>

      <CockpitCard
        title="최근 이관 · 매칭 현황"
        subtitle="추천인(파트너) 기준 최근 접수"
        icon={<Users className="w-4 h-4" />}
      >
        {recentReferrals.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">파트너 유입 접수가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentReferrals.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                <span className="font-bold text-slate-800">{lead.customer_name}</span>
                <span className="text-slate-400">←</span>
                <span className="text-cyan-700 font-semibold">{lead.referral_source}</span>
                <span className="text-[11px] text-slate-400 ml-auto tabular-nums">
                  {new Date(lead.created_at).toLocaleDateString("ko-KR")}
                </span>
                <span className="w-full sm:w-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {getV2LeadStatusLabel(lead.consultation_status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CockpitCard>
    </div>
  );
}

function ScheduleTab({ leads }: { leads: LeadDetail[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const leadsByDay = useMemo(() => {
    const map = new Map<number, LeadDetail[]>();
    for (const lead of leads) {
      const d = new Date(lead.created_at);
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue;
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(lead);
      map.set(day, list);
    }
    return map;
  }, [leads, viewYear, viewMonth]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(new Date(viewYear, viewMonth, 1));

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(1);
  };

  const selectedLeads =
    selectedDay != null ? (leadsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <CockpitCard
        title="접수 일정"
        subtitle="접수일 기준 달력 (클릭하여 상세)"
        icon={<CalendarDays className="w-4 h-4" />}
        className="lg:flex-1"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="font-bold text-slate-800">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const count = leadsByDay.get(day)?.length ?? 0;
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl text-sm font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors
                  ${isSelected ? "bg-[#0f2d5e] text-white" : "hover:bg-slate-100 text-slate-700"}
                  ${isToday && !isSelected ? "ring-2 ring-cyan-400 ring-offset-1" : ""}`}
              >
                <span>{day}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-bold px-1.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CockpitCard>

      <div className="lg:w-80 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {selectedDay != null ? `${viewMonth + 1}월 ${selectedDay}일` : "날짜 선택"}
          </p>
          <p className="text-sm font-black text-slate-900 mt-1">
            접수 {selectedLeads.length}건
          </p>
          {selectedLeads.length === 0 ? (
            <p className="text-sm text-slate-400 mt-4">해당 일자 접수가 없습니다.</p>
          ) : (
            <ul className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {selectedLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm"
                >
                  <p className="font-bold text-slate-800">{lead.customer_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatLeadDiseaseDisplay(lead.notes, lead.disease_name)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{getV2LeadStatusLabel(lead.consultation_status)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function V2OverviewTabPanels({
  tab,
  leads,
  users,
  canViewFinancialData = true,
}: Props) {
  switch (tab) {
    case "summary":
      return <SummaryTab leads={leads} />;
    case "finance":
      return canViewFinancialData ? <FinanceTab leads={leads} /> : <SummaryTab leads={leads} />;
    case "team":
      return (
        <TeamTab
          leads={leads}
          users={users}
          canViewFinancialData={canViewFinancialData}
        />
      );
    case "schedule":
      return <ScheduleTab leads={leads} />;
    case "faq":
      return <FAQAccordion />;
    default:
      return null;
  }
}
