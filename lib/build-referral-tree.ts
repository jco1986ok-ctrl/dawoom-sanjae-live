/** 추천인(parent_agent_id) 기준 재귀 조직 트리 — 마스터·총괄 투트랙 */

import type { PartnerUserRow } from "@/lib/build-organization-tree";
import { isMasterAdminRole, normalizeMasterDisplayName } from "@/lib/master-display";

export type ReferralTreeNode = {
  id: string;
  name: string;
  agentCode: string;
  role: string;
  joinedAt: string;
  status: "활성" | "비활성";
  parentAgentId: string | null;
  parentName: string | null;
  ownLeadsCount: number;
  ownContractsCount: number;
  subtreeLeadsCount: number;
  subtreeContractsCount: number;
  /** 트리 루트 기준 깊이 (0 = 표시 루트) */
  referralDepth: number;
  children: ReferralTreeNode[];
};

export type ReferralTreeForest = {
  /** 👑 마스터(정찬옥) 직속 · 본사 초대 라인 */
  masterTrackRoots: ReferralTreeNode[];
  /** 🤝 총괄파트너별 독립 네트워크 */
  headPartnerTrackRoots: ReferralTreeNode[];
};

const TREE_VISIBLE_ROLES = new Set([
  "관리자",
  "총판영업자",
  "하위영업자",
  "총괄공식파트너",
]);

type TrackKind = "master" | "head";

export function isOfficialPartnerRole(role: string): boolean {
  return role === "총판영업자" || role === "총괄공식파트너";
}

export function isAffiliatePartnerRole(role: string): boolean {
  return role === "하위영업자";
}

export { isMasterAdminRole };

export function partnerRoleBadgeLabel(role: string): string {
  switch (role) {
    case "관리자":
      return "👑 마스터";
    case "총판영업자":
      return "🤝 공식파트너";
    case "하위영업자":
      return "🧑‍💼 제휴파트너";
    case "총괄공식파트너":
      return "👑 총괄파트너";
    default:
      return role;
  }
}

function buildLeadsByUser(
  leads: Array<{ referred_by_user_id: string | null; consultation_status: string }>,
): Record<string, { total: number; done: number }> {
  return leads.reduce<Record<string, { total: number; done: number }>>((acc, lead) => {
    const uid = lead.referred_by_user_id;
    if (!uid) return acc;
    if (!acc[uid]) acc[uid] = { total: 0, done: 0 };
    acc[uid].total++;
    if (lead.consultation_status === "계약완료") acc[uid].done++;
    return acc;
  }, {});
}

function classifyPartnerTrack(
  userId: string,
  userMap: Record<string, PartnerUserRow>,
): { track: TrackKind; headRootId: string | null } {
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = userMap[currentId];
    if (!u) break;

    if (u.role === "총괄공식파트너") {
      return { track: "head", headRootId: u.id };
    }
    if (isMasterAdminRole(u.role)) {
      return { track: "master", headRootId: null };
    }
    currentId = u.parent_agent_id;
  }

  return { track: "master", headRootId: null };
}

function resolveParentInTrack(
  user: PartnerUserRow,
  trackUserIds: Set<string>,
  userMap: Record<string, PartnerUserRow>,
): string | null {
  let pid = user.parent_agent_id;
  const visited = new Set<string>();

  while (pid && !visited.has(pid)) {
    visited.add(pid);
    if (trackUserIds.has(pid)) return pid;
    pid = userMap[pid]?.parent_agent_id ?? null;
  }

  return null;
}

function buildTrackForest(
  trackUsers: PartnerUserRow[],
  userMap: Record<string, PartnerUserRow>,
  leadsByUser: Record<string, { total: number; done: number }>,
): ReferralTreeNode[] {
  const trackIds = new Set(trackUsers.map((u) => u.id));
  const childrenByParent = new Map<string, PartnerUserRow[]>();

  for (const u of trackUsers) {
    if (isMasterAdminRole(u.role)) continue;

    const parentId = resolveParentInTrack(u, trackIds, userMap);
    const bucket = parentId ?? "__root__";
    const list = childrenByParent.get(bucket) ?? [];
    list.push(u);
    childrenByParent.set(bucket, list);
  }

  const adminRoots = trackUsers.filter((u) => isMasterAdminRole(u.role));
  const orphanRoots = [...(childrenByParent.get("__root__") ?? [])];
  const primaryAdmin = adminRoots[0];

  if (primaryAdmin && orphanRoots.length > 0) {
    const merged = [...(childrenByParent.get(primaryAdmin.id) ?? []), ...orphanRoots];
    childrenByParent.set(primaryAdmin.id, merged);
    childrenByParent.delete("__root__");
  }

  function buildNode(u: PartnerUserRow, depth: number): ReferralTreeNode {
    const childUsers = [...(childrenByParent.get(u.id) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    );
    const children = childUsers.map((c) => buildNode(c, depth + 1));

    const ownLeadsCount = leadsByUser[u.id]?.total ?? 0;
    const ownContractsCount = leadsByUser[u.id]?.done ?? 0;
    let subtreeLeadsCount = ownLeadsCount;
    let subtreeContractsCount = ownContractsCount;
    for (const c of children) {
      subtreeLeadsCount += c.subtreeLeadsCount;
      subtreeContractsCount += c.subtreeContractsCount;
    }

    const parent = u.parent_agent_id ? userMap[u.parent_agent_id] : null;
    const displayName = normalizeMasterDisplayName(u.name, u.role);

    return {
      id: u.id,
      name: displayName,
      agentCode: u.agent_id,
      role: u.role,
      joinedAt: u.created_at.slice(0, 10),
      status: u.is_active ? "활성" : "비활성",
      parentAgentId: u.parent_agent_id ?? null,
      parentName: parent ? normalizeMasterDisplayName(parent.name, parent.role) : null,
      ownLeadsCount,
      ownContractsCount,
      subtreeLeadsCount,
      subtreeContractsCount,
      referralDepth: depth,
      children,
    };
  }

  const rootUsers = [
    ...adminRoots,
    ...(primaryAdmin ? [] : orphanRoots),
  ].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return rootUsers.map((u) => buildNode(u, 0));
}

/**
 * 마스터 트랙(정찬옥 직속) + 총괄파트너 트랙 분리 조직도
 * - 관리자 초대 → 마스터 하위
 * - 총괄 산하 → 총괄 트랙 (총괄이 마스터 직속이면 마스터 트랙에만 표시)
 */
export function buildDualTrackReferralForest(
  users: PartnerUserRow[],
  leads: Array<{ referred_by_user_id: string | null; consultation_status: string }>,
): ReferralTreeForest {
  const leadsByUser = buildLeadsByUser(leads);
  const userMap: Record<string, PartnerUserRow> = {};
  for (const u of users) userMap[u.id] = u;

  const visibleUsers = users.filter((u) => TREE_VISIBLE_ROLES.has(u.role));

  const masterUsers = visibleUsers.filter(
    (u) =>
      isMasterAdminRole(u.role) ||
      classifyPartnerTrack(u.id, userMap).track === "master",
  );

  const headRootIds = visibleUsers
    .filter((u) => u.role === "총괄공식파트너")
    .map((u) => u.id)
    .sort((a, b) => userMap[a].name.localeCompare(userMap[b].name, "ko"));

  const masterTrackRoots = buildTrackForest(masterUsers, userMap, leadsByUser);

  const headPartnerTrackRoots: ReferralTreeNode[] = [];
  for (const headId of headRootIds) {
    const headUsers = visibleUsers.filter(
      (u) =>
        u.id === headId ||
        classifyPartnerTrack(u.id, userMap).headRootId === headId,
    );
    headPartnerTrackRoots.push(...buildTrackForest(headUsers, userMap, leadsByUser));
  }

  return { masterTrackRoots, headPartnerTrackRoots };
}

export function flattenReferralForest(forest: ReferralTreeForest): ReferralTreeNode[] {
  return [...forest.masterTrackRoots, ...forest.headPartnerTrackRoots];
}

/** 단일 리스트 (하위 호환 · 스코프 필터용) */
export function buildReferralTree(
  users: PartnerUserRow[],
  leads: Array<{ referred_by_user_id: string | null; consultation_status: string }>,
): ReferralTreeNode[] {
  return flattenReferralForest(buildDualTrackReferralForest(users, leads));
}

export function findReferralTreeNode(
  roots: ReferralTreeNode[],
  nodeId: string,
): ReferralTreeNode | null {
  for (const root of roots) {
    if (root.id === nodeId) return root;
    const found = findInChildren(root, nodeId);
    if (found) return found;
  }
  return null;
}

function findInChildren(node: ReferralTreeNode, nodeId: string): ReferralTreeNode | null {
  for (const child of node.children) {
    if (child.id === nodeId) return child;
    const found = findInChildren(child, nodeId);
    if (found) return found;
  }
  return null;
}

/** 파트너 로그인 시 본인을 루트로 하위 계보만 표시 */
export function scopeReferralTreeToRoot(
  roots: ReferralTreeNode[],
  rootId: string,
): ReferralTreeNode[] {
  const node = findReferralTreeNode(roots, rootId);
  if (!node) return [];
  return [redepthNode(node, 0)];
}

function redepthNode(node: ReferralTreeNode, depth: number): ReferralTreeNode {
  return {
    ...node,
    referralDepth: depth,
    children: node.children.map((c) => redepthNode(c, depth + 1)),
  };
}

export function countReferralTreeNodes(roots: ReferralTreeNode[]): number {
  let n = 0;
  const walk = (nodes: ReferralTreeNode[]) => {
    for (const node of nodes) {
      n++;
      walk(node.children);
    }
  };
  walk(roots);
  return n;
}

export function countReferralTreeByRole(roots: ReferralTreeNode[]): {
  master: number;
  official: number;
  affiliate: number;
} {
  let master = 0;
  let official = 0;
  let affiliate = 0;
  const walk = (nodes: ReferralTreeNode[]) => {
    for (const node of nodes) {
      if (isMasterAdminRole(node.role)) master++;
      else if (isOfficialPartnerRole(node.role)) official++;
      else if (isAffiliatePartnerRole(node.role)) affiliate++;
      walk(node.children);
    }
  };
  walk(roots);
  return { master, official, affiliate };
}
