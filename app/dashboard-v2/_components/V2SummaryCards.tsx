import { AlertTriangle } from "lucide-react";
import type { V2MainSummaryCardSummary } from "@/lib/v2-overview-summary";
import { Card, CardContent } from "@/components/ui/card";
import { v2SurfaceCard } from "../_lib/v2-ui";
import { cn } from "@/lib/utils";

export default function V2SummaryCards({ cards }: { cards: V2MainSummaryCardSummary[] }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isDelay = card.id === "delay";

        return (
          <Card
            key={card.id}
            className={cn(
              v2SurfaceCard(),
              "gap-0 py-0",
              isDelay && "bg-red-50/80 border-red-100",
            )}
          >
            <CardContent className="px-4 py-4 flex flex-col min-h-[108px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wide",
                      isDelay ? "text-red-600" : "text-slate-500",
                    )}
                  >
                    {card.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5 truncate whitespace-nowrap",
                      isDelay ? "text-red-500/80" : "text-slate-400",
                    )}
                  >
                    {card.subtitle}
                  </p>
                </div>
                {isDelay && <AlertTriangle className="size-4 text-red-400 shrink-0" />}
              </div>

              <p className={cn("text-3xl sm:text-4xl font-bold tabular-nums mt-auto pt-3", card.countClass)}>
                {card.total}
                <span className="text-sm font-semibold ml-0.5 text-slate-400">건</span>
              </p>

              {card.breakdown.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {card.breakdown.map((item) => (
                    <li
                      key={item.status}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
                    >
                      {item.status} {item.count}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
