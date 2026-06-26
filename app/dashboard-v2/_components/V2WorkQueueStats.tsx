"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { V2WorkQueueStageStat } from "@/lib/v2-overview-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { v2SurfaceCard } from "../_lib/v2-ui";
import { cn } from "@/lib/utils";

function buildChartConfig(stats: V2WorkQueueStageStat[]): ChartConfig {
  return Object.fromEntries(
    stats.map((stat) => [
      stat.stage,
      { label: stat.label, color: stat.color },
    ]),
  );
}

export default function V2WorkQueueStats({ stats }: { stats: V2WorkQueueStageStat[] }) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const chartConfig = useMemo(() => buildChartConfig(stats), [stats]);

  const chartData = useMemo(() => {
    const active = stats.filter((s) => s.count > 0);
    if (active.length === 0) {
      return [{ stage: "empty" as const, label: "대기 없음", count: 1, fill: "hsl(214 32% 91%)" }];
    }
    return active.map((stat) => ({
      stage: stat.stage,
      label: stat.label,
      count: stat.count,
      fill: `var(--color-${stat.stage})`,
    }));
  }, [stats]);

  return (
    <Card className={cn(v2SurfaceCard(), "gap-0 py-0 h-full")}>
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">업무 대기 현황</CardTitle>
        <CardDescription className="text-xs">
          현재 단계에서 처리를 대기 중인 사건 수
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <div className="flex items-center gap-5 min-h-[148px]">
          <div className="relative flex flex-1 items-center justify-center min-w-0">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[140px] w-[140px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={46}
                  outerRadius={64}
                  strokeWidth={2}
                  stroke="#ffffff"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center"
              aria-hidden
            >
              <span className="text-3xl font-bold tabular-nums text-slate-900 leading-none">
                {total}
                <span className="text-base font-semibold text-slate-500">건</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-1">전체 대기</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-[136px] shrink-0">
            {stats.map((stat) => (
              <div
                key={stat.stage}
                className="flex items-center gap-2 rounded-lg bg-slate-50/80 px-2.5 py-2"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="text-[10px] font-medium text-slate-600 leading-snug flex-1 min-w-0">
                  {stat.label}
                </span>
                <span className="text-base font-bold tabular-nums text-slate-900 leading-none shrink-0">
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
