import type { V2BottleneckStat } from "@/lib/v2-overview-summary";

export default function V2BottleneckStats({ stats }: { stats: V2BottleneckStat[] }) {
  const max = Math.max(1, ...stats.map((s) => s.count));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="font-bold text-slate-900 text-sm">병목 현황 (Bottleneck Stats)</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          역할별 대기 중인 진행 사건 — 내근 · 현장 · 노무사
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.role}
            className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-bold text-slate-800">{stat.label}</p>
              <span className="text-2xl font-black text-[#0f2d5e] tabular-nums">{stat.count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${stat.barClass}`}
                style={{ width: `${Math.round((stat.count / max) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{stat.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
