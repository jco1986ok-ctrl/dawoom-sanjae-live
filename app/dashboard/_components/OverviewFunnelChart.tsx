"use client";

import {
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PipelineFunnel } from "@/lib/analytics-cockpit";

const STAGE_COLORS = ["#0ea5e9", "#8b5cf6", "#6366f1", "#14b8a6"];

export default function OverviewFunnelChart({ funnel }: { funnel: PipelineFunnel }) {
  const stages = [
    { name: "신규 유입", value: funnel.newLeads, key: "new" },
    { name: "상담 · 위임", value: funnel.consultDelegation, key: "consult" },
    { name: "공단 심사", value: funnel.agencyReview, key: "review" },
    { name: "산재 승인", value: funnel.approved, key: "approved" },
  ];

  const top = Math.max(stages[0]?.value ?? 0, 1);
  const chartData = stages.map((s, i) => ({
    ...s,
    fill: STAGE_COLORS[i],
    rateFromTop: top > 0 ? Math.round((s.value / top) * 100) : 0,
  }));

  const totalInflow = stages.reduce((sum, s) => sum + s.value, 0);
  const approvalRate =
    funnel.newLeads > 0 ? Math.round((funnel.approved / funnel.newLeads) * 100) : 0;

  if (totalInflow === 0) {
    return (
      <p className="text-sm text-slate-400 py-12 text-center">
        아직 퍼널에 집계할 접수 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      <div className="flex-1 min-h-[280px] min-w-0">
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip
              content={({ payload }) => {
                const item = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                if (!item) return null;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-slate-600 mt-0.5">{item.value}건</p>
                    <p className="text-slate-400">유입 대비 {item.rateFromTop}%</p>
                  </div>
                );
              }}
            />
            <Funnel
              dataKey="value"
              data={chartData}
              isAnimationActive
              lastShapeType="rectangle"
            >
              <LabelList
                position="right"
                fill="#334155"
                stroke="none"
                dataKey="name"
                className="text-xs font-semibold"
              />
              <LabelList
                position="center"
                fill="#fff"
                stroke="none"
                dataKey="value"
                formatter={(v: number) => `${v}건`}
                className="text-[11px] font-bold"
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      <div className="lg:w-52 shrink-0 flex flex-col gap-2 justify-center">
        {chartData.map((stage, i) => {
          const prev = i > 0 ? chartData[i - 1].value : null;
          const stepRate =
            prev != null && prev > 0 ? Math.round((stage.value / prev) * 100) : null;
          return (
            <div
              key={stage.key}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.fill }}
                />
                <span className="text-[11px] font-bold text-slate-700">{stage.name}</span>
              </div>
              <p className="text-lg font-black text-slate-900 tabular-nums mt-1 pl-4">
                {stage.value}건
              </p>
              {stepRate != null && (
                <p className="text-[10px] text-slate-400 pl-4">이전 단계 대비 {stepRate}%</p>
              )}
            </div>
          );
        })}
        <div className="rounded-xl bg-[#0f2d5e] text-white px-3 py-3 mt-1">
          <p className="text-[10px] font-bold text-blue-200">유입 → 승인 전환율</p>
          <p className="text-2xl font-black tabular-nums mt-0.5">{approvalRate}%</p>
        </div>
      </div>
    </div>
  );
}
