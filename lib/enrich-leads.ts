import type { LeadDetail } from "@/lib/lead-detail";
import {
  buildLeadLineage,
  formatLeadLineageLabel,
  type LineageUserRow,
} from "@/lib/lead-lineage";
import {
  describeAgentAccount,
  describeInflowLink,
  type AgentAccountInfo,
  type InflowInfo,
} from "@/lib/lead-attribution";
import {
  buildAttributionTraceLabel,
  formatPartnerDisplayLabel,
  resolveEffectiveAttribution,
  resolvePartnerForLeadEnhanced,
} from "@/lib/lead-attribution-resolve";
import type { UserLineageNode } from "@/lib/user-lineage";

export type EnrichedLead = LeadDetail & {
  inflow: InflowInfo;
  agent: AgentAccountInfo;
  lineage: UserLineageNode[];
  lineage_label: string;
  attribution_trace?: string | null;
};

type LeadRow = LeadDetail & {
  referred_by_user_id?: string | null;
  referral_source?: string | null;
  referrer?: string | null;
};

export function enrichLeadRow(
  lead: LeadRow,
  userById: Record<string, LineageUserRow>,
  userByAgentId: Record<string, LineageUserRow>,
  extra?: Partial<LeadDetail>,
): EnrichedLead {
  const effective = resolveEffectiveAttribution(lead);
  const partner = resolvePartnerForLeadEnhanced(lead, userById, userByAgentId);

  const partnerId = partner?.id ?? lead.referred_by_user_id ?? null;
  const lineage = buildLeadLineage(partnerId, userById);

  const parentId = partner?.parent_agent_id ?? null;
  const parentInfo = parentId ? userById[parentId] : null;

  const inflow = describeInflowLink(effective.referralSource, effective.referrer);
  const agent = describeAgentAccount(partner, effective.referralSource);
  const partnerName = formatPartnerDisplayLabel({
    partner_name: partner?.name ?? extra?.partner_name ?? null,
    lineage,
    agent,
    referral_source: effective.referralSource,
    notesAttribution: effective.notesAttribution,
  });

  return {
    ...lead,
    ...extra,
    referral_source: effective.referralSource ?? lead.referral_source,
    referrer: effective.referrer ?? lead.referrer,
    partner_name: partnerName,
    partner_agent_id: partner?.agent_id ?? agent.agentId,
    parent_partner_name: parentInfo?.name ?? extra?.parent_partner_name ?? null,
    inflow,
    agent,
    lineage,
    lineage_label: formatLeadLineageLabel(lineage),
    attribution_trace: buildAttributionTraceLabel(effective, partnerName),
  };
}

export function enrichLeads(
  leads: LeadRow[],
  users: LineageUserRow[],
  perLeadExtra?: (lead: LeadRow) => Partial<LeadDetail>,
): EnrichedLead[] {
  const userById: Record<string, LineageUserRow> = {};
  const userByAgentId: Record<string, LineageUserRow> = {};
  for (const u of users) {
    userById[u.id] = u;
    userByAgentId[u.agent_id] = u;
  }

  return leads.map((l) =>
    enrichLeadRow(l, userById, userByAgentId, perLeadExtra?.(l)),
  );
}
