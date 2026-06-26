import type { LeadDetail } from "@/lib/lead-detail";
import {
  buildLeadLineage,
  formatLeadLineageLabel,
  type LineageUserRow,
} from "@/lib/lead-lineage";
import {
  describeAgentAccount,
  describeInflowLink,
  resolvePartnerForLead,
  type AgentAccountInfo,
  type InflowInfo,
} from "@/lib/lead-attribution";
import type { UserLineageNode } from "@/lib/user-lineage";

export type EnrichedLead = LeadDetail & {
  inflow: InflowInfo;
  agent: AgentAccountInfo;
  lineage: UserLineageNode[];
  lineage_label: string;
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
  const partner = resolvePartnerForLead(
    lead.referred_by_user_id,
    lead.referral_source,
    userById,
    userByAgentId,
  );

  const partnerId = partner?.id ?? lead.referred_by_user_id ?? null;
  const lineage = buildLeadLineage(partnerId, userById);

  const parentId = partner?.parent_agent_id ?? null;
  const parentInfo = parentId ? userById[parentId] : null;

  const inflow = describeInflowLink(lead.referral_source, lead.referrer);
  const agent = describeAgentAccount(partner, lead.referral_source);

  return {
    ...lead,
    ...extra,
    partner_name: partner?.name ?? extra?.partner_name ?? null,
    partner_agent_id: partner?.agent_id ?? agent.agentId,
    parent_partner_name: parentInfo?.name ?? extra?.parent_partner_name ?? null,
    inflow,
    agent,
    lineage,
    lineage_label: formatLeadLineageLabel(lineage),
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
