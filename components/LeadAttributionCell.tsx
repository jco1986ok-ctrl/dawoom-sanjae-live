import type { InflowInfo, AgentAccountInfo } from "@/lib/lead-attribution";

const INFLOW_STYLE: Record<InflowInfo["type"], string> = {
  partner_ref: "bg-indigo-50 text-indigo-700 border-indigo-200",
  partner_name_legacy: "bg-amber-50 text-amber-800 border-amber-200",
  natural: "bg-slate-100 text-slate-500 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

export function InflowLinkBadge({ inflow }: { inflow: InflowInfo }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className={`inline-flex items-center w-fit text-[10px] font-bold px-2 py-0.5 rounded-full border ${INFLOW_STYLE[inflow.type]}`}
      >
        {inflow.type === "partner_ref" && "🔗 "}
        {inflow.type === "natural" && "🌐 "}
        {inflow.type === "partner_name_legacy" && "📎 "}
        {inflow.label}
      </span>
      {inflow.linkParam && (
        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
          {inflow.linkParam}
        </span>
      )}
    </div>
  );
}

export function AgentAccountBadge({ agent }: { agent: AgentAccountInfo }) {
  if (!agent.name && !agent.agentId) {
    return <span className="text-slate-300 text-xs">미배정</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {agent.name && (
        <span className="font-semibold text-slate-800 text-xs">{agent.name}</span>
      )}
      {agent.agentId && (
        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-fit">
          {agent.agentId}
        </span>
      )}
      {agent.unresolved && (
        <span className="text-[10px] text-amber-600">계정 미매칭</span>
      )}
    </div>
  );
}

export function LeadAttributionInline({
  inflow,
  agent,
}: {
  inflow: InflowInfo;
  agent: AgentAccountInfo;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InflowLinkBadge inflow={inflow} />
      {(agent.name || agent.agentId) && (
        <>
          <span className="text-slate-300 text-xs">→</span>
          <AgentAccountBadge agent={agent} />
        </>
      )}
    </div>
  );
}
