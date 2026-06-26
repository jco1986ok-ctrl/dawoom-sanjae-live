"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { V2BottleneckStat } from "@/lib/v2-overview-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const CHART_CONFIG = {
  inside_staff: { label: "내근", color: "hsl(199 89% 48%)" },
  field_manager: { label: "현장", color: "hsl(38 92% 50%)" },
  attorney: { label: "노무사", color: "hsl(262 83% 58%)" },
} satisfies ChartConfig;

export default function V2BottleneckStats({ stats }: { stats: V2BottleneckStat[] }) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  const chartData = useMemo(() => {
    if (total === 0) {
      return [{ role: "empty" as const, label: "대기 없음", count: 1, fill: "hsl(214 32% 91%)" }];
    }
    return stats.map((stat) => ({
      role: stat.role,
      label: stat.label,
      count: stat.count,
      fill: `var(--color-${stat.role})`,
    }));
  }, [stats, total]);

  return (
    <Card className="gap-0 py-0 shadow-sm border-slate-200/80 bg-white h-full">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">병목 현황</CardTitle>
        <CardDescription className="text-xs">역할별 진행 중 대기 건</CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-4">
          <ChartContainer config={CHART_CONFIG} className="aspect-square h-[100px] w-[100px] shrink-0">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                innerRadius={30}
                outerRadius={46}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.role} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-3">
              {stats.map((stat, index) => (
                <div key={stat.role} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <span
                      className="size-2 rounded-full shrink-0 mb-1"
                      style={{ backgroundColor: CHART_CONFIG[stat.role].color }}
                    />
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">
                      {stat.label}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-slate-900 leading-tight">
                      {stat.count}
                    </span>
                  </div>
                  {index < stats.length - 1 && (
                    <div className="h-px flex-1 bg-slate-200 mx-1 mt-[-14px]" aria-hidden />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              전체 진행 {total}건 · 완료 건 제외
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
