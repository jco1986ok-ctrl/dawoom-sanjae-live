import type {
  AffiliatePartnerRow,
  OfficialPartnerRow,
} from "@/app/dashboard/_components/PartnerAccordionTable";
import {
  buildLineagePathInfo,
  groupAffiliatesByOfficialPartner,
  type PartnerUserRow,
} from "@/lib/build-organization-tree";

type UserRow = PartnerUserRow;

type LeadStatRow = {
  referred_by_user_id: string | null;
  consultation_status: string;
};

function countLeads(
  userIds: string[],
  leadsByUser: Record<string, { total: number; done: number }>,
): { leadsCount: number; contractsCount: number } {
  let leadsCount = 0;
  let contractsCount = 0;
  for (const id of userIds) {
    leadsCount += leadsByUser[id]?.total ?? 0;
    contractsCount += leadsByUser[id]?.done ?? 0;
  }
  return { leadsCount, contractsCount };
}

function buildLeadsByUser(leads: LeadStatRow[]): Record<string, { total: number; done: number }> {
  return leads.reduce<Record<string, { total: number; done: number }>>((acc, lead) => {
    const uid = lead.referred_by_user_id;
    if (!uid) return acc;
    if (!acc[uid]) acc[uid] = { total: 0, done: 0 };
    acc[uid].total++;
    if (lead.consultation_status === "계약완료") acc[uid].done++;
    return acc;
  }, {});
}

function sortAffiliates(a: UserRow, b: UserRow, userMap: Record<string, PartnerUserRow>): number {
  const depthA = buildLineagePathInfo(a.id, userMap).depth;
  const depthB = buildLineagePathInfo(b.id, userMap).depth;
  if (depthA !== depthB) return depthA - depthB;
  return a.name.localeCompare(b.name, "ko");
}

function toAffiliateRow(
  u: UserRow,
  userMap: Record<string, PartnerUserRow>,
  leadsByUser: Record<string, { total: number; done: number }>,
  fallbackParentName: string,
): AffiliatePartnerRow {
  const stats = leadsByUser[u.id] ?? { total: 0, done: 0 };
  const { path, depth } = buildLineagePathInfo(u.id, userMap);
  const directParent = u.parent_agent_id ? userMap[u.parent_agent_id] : null;

  return {
    id: u.id,
    name: u.name,
    agentCode: u.agent_id,
    leadsCount: stats.total,
    contractsCount: stats.done,
    joinedAt: u.created_at.slice(0, 10),
    status: u.is_active ? "활성" : "비활성",
    parentAgentId: u.parent_agent_id ?? null,
    parentName: directParent?.name ?? fallbackParentName,
    lineagePath: path,
    lineageDepth: depth,
  };
}

function buildVirtualHeadDirectRow(
  affiliates: UserRow[],
  userMap: Record<string, PartnerUserRow>,
  leadsByUser: Record<string, { total: number; done: number }>,
  label: string,
): OfficialPartnerRow | null {
  if (affiliates.length === 0) return null;

  const sorted = [...affiliates].sort((a, b) => sortAffiliates(a, b, userMap));
  const affiliateRows = sorted.map((s) => {
    const parentLabel = s.parent_agent_id
      ? (userMap[s.parent_agent_id]?.name ?? "총괄 파트너")
      : "총괄 파트너";
    return toAffiliateRow(s, userMap, leadsByUser, parentLabel);
  });
  const ids = sorted.map((s) => s.id);
  const { leadsCount, contractsCount } = countLeads(ids, leadsByUser);

  return {
    id: "__head-direct__",
    name: label,
    agentCode: "—",
    leadsCount,
    contractsCount,
    joinedAt: "—",
    status: "활성",
    isVirtual: true,
    affiliates: affiliateRows,
  };
}

/**
 * 파트너 조직 트리 — 모든 제휴파트너를 parent_agent_id 체인으로 추적해
 * 최상위 공식파트너(또는 총괄 직속) 산하로 롤업.
 */
export function buildPartnerAccordionRows(
  officials: UserRow[],
  allAffiliates: UserRow[],
  leads: LeadStatRow[],
  userMap: Record<string, PartnerUserRow>,
): OfficialPartnerRow[] {
  const leadsByUser = buildLeadsByUser(leads);
  const { byOfficialId, headDirect, orphans } = groupAffiliatesByOfficialPartner(
    allAffiliates,
    userMap,
  );

  const rows: OfficialPartnerRow[] = officials.map((op) => {
    const subs = [...(byOfficialId.get(op.id) ?? [])].sort((a, b) =>
      sortAffiliates(a, b, userMap),
    );
    const subIds = subs.map((s) => s.id);
    const { leadsCount, contractsCount } = countLeads([op.id, ...subIds], leadsByUser);

    return {
      id: op.id,
      name: op.name,
      agentCode: op.agent_id,
      leadsCount,
      contractsCount,
      joinedAt: op.created_at.slice(0, 10),
      status: op.is_active ? "활성" : "비활성",
      ownLeadsCount: leadsByUser[op.id]?.total ?? 0,
      ownContractsCount: leadsByUser[op.id]?.done ?? 0,
      affiliates: subs.map((s) => toAffiliateRow(s, userMap, leadsByUser, op.name)),
    };
  });

  const headRow = buildVirtualHeadDirectRow(
    headDirect,
    userMap,
    leadsByUser,
    "총괄 직속 제휴",
  );
  if (headRow) rows.unshift(headRow);

  const orphanRow = buildVirtualHeadDirectRow(
    orphans,
    userMap,
    leadsByUser,
    "계보 미연결 제휴",
  );
  if (orphanRow) {
    orphanRow.id = "__orphan__";
    orphanRow.name = "계보 미연결 제휴";
    rows.push(orphanRow);
  }

  return rows;
}

/** 공식파트너 행 실적 = 본인 + 산하 제휴파트너(전 depth) 합산 */
export function recomputeOfficialRowTotals(row: OfficialPartnerRow): OfficialPartnerRow {
  const ownLeads = row.ownLeadsCount ?? 0;
  const ownContracts = row.ownContractsCount ?? 0;
  let leadsCount = ownLeads;
  let contractsCount = ownContracts;

  for (const aff of row.affiliates) {
    leadsCount += aff.leadsCount;
    contractsCount += aff.contractsCount;
  }

  return { ...row, leadsCount, contractsCount };
}
