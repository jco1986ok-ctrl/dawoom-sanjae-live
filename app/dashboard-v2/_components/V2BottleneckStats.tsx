"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { V2BottleneckStat } from "@/lib/v2-overview-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { v2SurfaceCard } from "../_lib/v2-ui";
import { cn } from "@/lib/utils";

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
    <Card className={cn(v2SurfaceCard(), "gap-0 py-0 h-full")}>
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">병목 현황</CardTitle>
        <CardDescription className="text-xs">역할별 진행 중 대기 건</CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="flex items-center gap-5 min-h-[148px]">
          <div className="flex flex-1 items-center justify-center min-w-0">
            <ChartContainer
              config={CHART_CONFIG}
              className="mx-auto aspect-square h-[132px] w-[132px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={40}
                  outerRadius={62}
                  strokeWidth={2}
                  stroke="#ffffff"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.role} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <div className="flex flex-col gap-2.5 w-[108px] shrink-0">
            {stats.map((stat) => (
              <div
                key={stat.role}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/80 px-2.5 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_CONFIG[stat.role].color }}
                  />
                  <span className="text-xs font-medium text-slate-600 truncate">
                    {CHART_CONFIG[stat.role].label}
                  </span>
                </div>
                <span className="text-base font-bold tabular-nums text-slate-900 leading-none">
                  {stat.count}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 text-right pt-0.5">
              합계 {total}건
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
