import type { OfficialPartnerRow } from "@/app/dashboard/_components/PartnerAccordionTable";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPartnerAccordionRows,
  recomputeOfficialRowTotals,
} from "@/lib/build-partner-accordion";
import {
  buildDualTrackReferralForest,
  flattenReferralForest,
  type ReferralTreeForest,
  type ReferralTreeNode,
} from "@/lib/build-referral-tree";
import {
  groupAffiliatesByOfficialPartner,
  type PartnerUserRow,
} from "@/lib/build-organization-tree";

type AdminClient = ReturnType<typeof createAdminClient>;

type DbUser = PartnerUserRow;

export type OfficialPartnerStatRow = {
  id: string;
  name: string;
  code: string;
  members: number;
  total: number;
  done: number;
  rate: number;
};

export type PartnerNetworkDashboardData = {
  partnerAccordionRows: OfficialPartnerRow[];
  referralTreeRoots: ReferralTreeNode[];
  referralTreeForest: ReferralTreeForest;
  officialPartnerStats: OfficialPartnerStatRow[];
  totalMemberCount: number;
};

function mapUser(u: {
  id: unknown;
  name: unknown;
  agent_id: unknown;
  is_active: unknown;
  created_at: unknown;
  parent_agent_id?: unknown;
  role?: unknown;
}): DbUser {
  return {
    id: u.id as string,
    name: u.name as string,
    agent_id: u.agent_id as string,
    is_active: u.is_active as boolean,
    created_at: u.created_at as string,
    parent_agent_id: (u.parent_agent_id as string | null) ?? null,
    role: (u.role as string) ?? "하위영업자",
  };
}

function buildPartnerUserMap(users: DbUser[]): Record<string, DbUser> {
  const map: Record<string, DbUser> = {};
  for (const u of users) map[u.id] = u;
  return map;
}

function affiliateInNetwork(
  affiliateId: string,
  userMap: Record<string, DbUser>,
  headPartnerId?: string,
): boolean {
  if (!headPartnerId) return true;

  let currentId: string | null = affiliateId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === headPartnerId) return true;
    const u = userMap[currentId];
    if (!u) break;
    currentId = u.parent_agent_id;
  }

  return false;
}

/** 총괄 파트너(본인 네트워크) 또는 관리자(전체)용 파트너 목록·실적 데이터 */
export async function loadPartnerNetworkDashboard(
  adminClient: AdminClient,
  options: { headPartnerId?: string } = {},
): Promise<PartnerNetworkDashboardData> {
  const { headPartnerId } = options;

  const { data: partnerUsersRaw = [] } = await adminClient
    .from("users")
    .select("id, name, agent_id, is_active, created_at, parent_agent_id, role")
    .in("role", ["하위영업자", "총판영업자", "총괄공식파트너", "관리자"])
    .order("name");

  const allPartnerUsers = (partnerUsersRaw ?? []).map(mapUser);
  const userMap = buildPartnerUserMap(allPartnerUsers);

  const officials = allPartnerUsers.filter((u) => u.role === "총판영업자");

  let allAffiliates = allPartnerUsers.filter((u) => u.role === "하위영업자");

  if (headPartnerId) {
    allAffiliates = allAffiliates.filter((a) =>
      affiliateInNetwork(a.id, userMap, headPartnerId),
    );
  }

  const visibleOfficials = headPartnerId
    ? officials.filter((o) => affiliateInNetwork(o.id, userMap, headPartnerId))
    : officials;

  const networkUserIds = new Set<string>();
  if (headPartnerId) networkUserIds.add(headPartnerId);
  visibleOfficials.forEach((p) => networkUserIds.add(p.id));
  allAffiliates.forEach((m) => networkUserIds.add(m.id));

  const { data: statsLeadsRaw = [] } = headPartnerId
    ? networkUserIds.size > 0
      ? await adminClient
          .from("leads")
          .select("referred_by_user_id, consultation_status")
          .in("referred_by_user_id", Array.from(networkUserIds))
      : { data: [] }
    : await adminClient
        .from("leads")
        .select("referred_by_user_id, consultation_status");

  const statsLeads = (statsLeadsRaw ?? []).map((l) => ({
    referred_by_user_id: l.referred_by_user_id as string | null,
    consultation_status: l.consultation_status as string,
  }));

  const leadsByUser = statsLeads.reduce<Record<string, { total: number; done: number }>>(
    (acc, lead) => {
      const uid = lead.referred_by_user_id;
      if (!uid) return acc;
      if (!acc[uid]) acc[uid] = { total: 0, done: 0 };
      acc[uid].total++;
      if (lead.consultation_status === "계약완료") acc[uid].done++;
      return acc;
    },
    {},
  );

  const { byOfficialId } = groupAffiliatesByOfficialPartner(allAffiliates, userMap);

  const officialPartnerStats: OfficialPartnerStatRow[] = visibleOfficials.map((p) => {
    const subs = byOfficialId.get(p.id) ?? [];
    const allIds = [p.id, ...subs.map((s) => s.id)];
    const total = allIds.reduce((s, id) => s + (leadsByUser[id]?.total ?? 0), 0);
    const done = allIds.reduce((s, id) => s + (leadsByUser[id]?.done ?? 0), 0);
    return {
      id: p.id,
      name: p.name,
      code: p.agent_id,
      members: subs.length,
      total,
      done,
      rate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const partnerAccordionRows = buildPartnerAccordionRows(
    visibleOfficials,
    allAffiliates,
    statsLeads,
    userMap,
  ).map(recomputeOfficialRowTotals);

  const referralTreeForest = buildDualTrackReferralForest(allPartnerUsers, statsLeads);
  const referralTreeRoots = flattenReferralForest(referralTreeForest);

  return {
    partnerAccordionRows,
    referralTreeRoots,
    referralTreeForest,
    officialPartnerStats,
    totalMemberCount: visibleOfficials.length + allAffiliates.length,
  };
}
