import { AlertTriangle } from "lucide-react";
import {
  computeStatusGroupSummaries,
  type StatusGroupSummary,
} from "@/lib/overview-dashboard";

export default function OverviewStatusGroupCards({
  statusCount,
}: {
  statusCount: Record<string, number>;
}) {
  const groups = computeStatusGroupSummaries(statusCount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {groups.map((group) => (
        <StatusGroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}

function StatusGroupCard({ group }: { group: StatusGroupSummary }) {
  const isDelay = group.id === "delay";

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 min-w-0 shadow-sm ${group.cardClass} ${
        isDelay ? "relative overflow-hidden" : ""
      }`}
    >
      {isDelay && (
        <div className="absolute top-3 right-3 text-red-400/80">
          <AlertTriangle className="w-5 h-5" />
        </div>
      )}
      <p className={`text-xs font-bold uppercase tracking-wider ${isDelay ? "text-red-600" : "text-slate-500"}`}>
        {group.label}
      </p>
      <p className={`text-[11px] mt-0.5 ${isDelay ? "text-red-500/90" : "text-slate-400"}`}>
        {group.subtitle}
      </p>
      <p className={`text-3xl sm:text-4xl font-black tabular-nums mt-3 ${group.countClass}`}>
        {group.total}
        <span className="text-base font-bold ml-1 opacity-70">건</span>
      </p>
      {group.breakdown.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {group.breakdown.map((item) => (
            <li
              key={item.status}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${group.badgeClass}`}
            >
              {item.status} {item.count}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
