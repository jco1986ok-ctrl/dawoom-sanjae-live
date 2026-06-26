import { Banknote, CheckCircle2, FileStack, TrendingUp } from "lucide-react";
import { formatKrw } from "@/lib/lead-fee";
import type { MonthlyFinancialSummary } from "@/lib/overview-dashboard";

const MONTH_LABEL = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
}).format(new Date());

export default function OverviewFinancialSummary({
  summary,
}: {
  summary: MonthlyFinancialSummary;
}) {
  const rows = [
    {
      icon: <Banknote className="w-4 h-4" />,
      label: "총 예상 매출",
      value: formatKrw(summary.totalFeeAmount),
      highlight: true,
    },
    {
      icon: <FileStack className="w-4 h-4" />,
      label: "이번 달 접수",
      value: `${summary.monthLeadCount}건`,
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "수임·진행 중",
      value: `${summary.contractedCount}건`,
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "승인 완료 매출",
      value: formatKrw(summary.approvedFeeAmount),
      sub: `${summary.approvedCount}건`,
    },
  ];

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 h-full flex flex-col">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          재무 요약
        </p>
        <h3 className="text-sm font-black text-slate-900 mt-0.5">{MONTH_LABEL} 기준</h3>
        <p className="text-[11px] text-slate-500 mt-1">
          예상 수임료(fee_amount) 합계 · 미입력 건은 0원
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`rounded-xl px-4 py-3 border ${
              row.highlight
                ? "bg-[#0f2d5e] border-[#0f2d5e] text-white"
                : "bg-white/80 border-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 opacity-80">
              <span className={row.highlight ? "text-blue-200" : "text-emerald-600"}>
                {row.icon}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  row.highlight ? "text-blue-100" : "text-slate-500"
                }`}
              >
                {row.label}
              </span>
            </div>
            <p
              className={`text-xl font-black tabular-nums mt-1 ${
                row.highlight ? "text-white" : "text-slate-900"
              }`}
            >
              {row.value}
            </p>
            {"sub" in row && row.sub && (
              <p className={`text-[10px] mt-0.5 ${row.highlight ? "text-blue-200" : "text-slate-400"}`}>
                {row.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
