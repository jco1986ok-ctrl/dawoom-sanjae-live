import { AlertTriangle } from "lucide-react";
import type { V2MainSummaryCardSummary } from "@/lib/v2-overview-summary";

export default function V2SummaryCards({ cards }: { cards: V2MainSummaryCardSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`rounded-2xl border p-5 sm:p-6 min-h-[140px] flex flex-col shadow-sm ${card.cardClass} ${
            card.id === "delay" ? "relative overflow-hidden" : ""
          }`}
        >
          {card.id === "delay" && (
            <AlertTriangle className="absolute top-4 right-4 w-5 h-5 text-red-400/80" />
          )}
          <p className={`text-xs font-bold uppercase tracking-wider ${card.id === "delay" ? "text-red-600" : "text-slate-500"}`}>
            {card.label}
          </p>
          <p className={`text-[11px] mt-1 ${card.id === "delay" ? "text-red-500/90" : "text-slate-400"}`}>
            {card.subtitle}
          </p>
          <p className={`text-4xl sm:text-5xl font-black tabular-nums mt-auto pt-4 ${card.countClass}`}>
            {card.total}
            <span className="text-lg font-bold ml-1 opacity-70">건</span>
          </p>
          {card.breakdown.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1">
              {card.breakdown.map((item) => (
                <li
                  key={item.status}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeClass}`}
                >
                  {item.status} {item.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
