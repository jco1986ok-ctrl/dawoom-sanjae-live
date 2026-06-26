import type { UserLineageNode } from "@/lib/user-lineage";
import { formatLeadLineageLabel } from "@/lib/lead-lineage";

const ROLE_CHIP: Record<string, string> = {
  총괄공식파트너: "bg-violet-100 text-violet-800 border-violet-200",
  총판영업자: "bg-blue-100 text-blue-800 border-blue-200",
  하위영업자: "bg-emerald-100 text-emerald-800 border-emerald-200",
  관리자: "bg-amber-100 text-amber-800 border-amber-200",
};

export function LineagePathBadge({
  lineage,
  compact = false,
}: {
  lineage: UserLineageNode[];
  compact?: boolean;
}) {
  if (lineage.length === 0) {
    return (
      <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        유입 계정 미확인
      </span>
    );
  }

  if (compact && lineage.length > 2) {
    return (
      <span
        className="text-[11px] text-slate-700 leading-snug"
        title={formatLeadLineageLabel(lineage)}
      >
        {formatLeadLineageLabel(lineage)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex flex-wrap items-center gap-1">
        {lineage.map((node, i) => (
          <span key={node.id} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-slate-300 text-[10px]">›</span>}
            <span
              className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                ROLE_CHIP[node.role] ?? "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {node.name}
            </span>
          </span>
        ))}
      </div>
      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
        {lineage[lineage.length - 1]?.agent_id}
      </span>
    </div>
  );
}
