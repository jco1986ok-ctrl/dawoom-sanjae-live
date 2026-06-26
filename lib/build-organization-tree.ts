/** 파트너 조직도 — parent_agent_id 체인 추적 · 공식파트너 롤업 · 유입 경로 */

export type PartnerUserRow = {
  id: string;
  name: string;
  role: string;
  agent_id: string;
  is_active: boolean;
  created_at: string;
  parent_agent_id: string | null;
};

export type RollupTarget =
  | { kind: "official"; officialId: string }
  | { kind: "head-direct" }
  | { kind: "orphan" };

export type LineagePathInfo = {
  /** 예: "홍길동 공식파트너 > 김철수 제휴파트너 > 본인" */
  path: string;
  /** 공식파트너 직속=1, 손자=2 … */
  depth: number;
};

const ROLE_SEGMENT_LABEL: Record<string, string> = {
  총판영업자: "공식파트너",
  하위영업자: "제휴파트너",
  총괄공식파트너: "총괄파트너",
  관리자: "본사",
};

function roleSegmentLabel(role: string): string {
  return ROLE_SEGMENT_LABEL[role] ?? role;
}

/** userId에서 parent_agent_id를 따라 최종 롤업 대상(공식파트너 / 총괄 직속) 결정 */
export function resolveRollupTarget(
  userId: string,
  userMap: Record<string, PartnerUserRow>,
): RollupTarget {
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = userMap[currentId];
    if (!u) break;

    if (u.role === "총판영업자") {
      return { kind: "official", officialId: u.id };
    }
    if (u.role === "총괄공식파트너" || u.role === "관리자") {
      return { kind: "head-direct" };
    }

    currentId = u.parent_agent_id;
  }

  return { kind: "orphan" };
}

/** root → current 순 체인 (buildUserLineage과 동일 방향) */
export function buildPartnerChain(
  userId: string,
  userMap: Record<string, PartnerUserRow>,
): PartnerUserRow[] {
  const chain: PartnerUserRow[] = [];
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = userMap[currentId];
    if (!u) break;
    chain.unshift(u);
    currentId = u.parent_agent_id;
  }

  return chain;
}

/** 유입 라인 경로 · 공식파트너 기준 depth */
export function buildLineagePathInfo(
  userId: string,
  userMap: Record<string, PartnerUserRow>,
): LineagePathInfo {
  const chain = buildPartnerChain(userId, userMap);
  if (chain.length === 0) {
    return { path: "본인", depth: 1 };
  }

  const officialIdx = chain.findIndex((n) => n.role === "총판영업자");
  const headIdx = chain.findIndex(
    (n) => n.role === "총괄공식파트너" || n.role === "관리자",
  );

  let relevantChain: PartnerUserRow[];
  if (officialIdx >= 0) {
    relevantChain = chain.slice(officialIdx);
  } else if (headIdx >= 0) {
    relevantChain = chain.slice(headIdx);
  } else {
    relevantChain = chain;
  }

  const segments = relevantChain.slice(0, -1).map(
    (n) => `${n.name} ${roleSegmentLabel(n.role)}`,
  );
  segments.push("본인");

  const depth = Math.max(1, relevantChain.length - 1);

  return {
    path: segments.join(" > "),
    depth,
  };
}

/** 공식파트너 행에 편입할 제휴파트너 ID 목록 (직·간접 후손 전부) */
export function groupAffiliatesByOfficialPartner(
  affiliates: PartnerUserRow[],
  userMap: Record<string, PartnerUserRow>,
): {
  byOfficialId: Map<string, PartnerUserRow[]>;
  headDirect: PartnerUserRow[];
  orphans: PartnerUserRow[];
} {
  const byOfficialId = new Map<string, PartnerUserRow[]>();
  const headDirect: PartnerUserRow[] = [];
  const orphans: PartnerUserRow[] = [];

  for (const aff of affiliates) {
    const target = resolveRollupTarget(aff.id, userMap);
    if (target.kind === "official") {
      const list = byOfficialId.get(target.officialId) ?? [];
      list.push(aff);
      byOfficialId.set(target.officialId, list);
    } else if (target.kind === "head-direct") {
      headDirect.push(aff);
    } else {
      orphans.push(aff);
    }
  }

  return { byOfficialId, headDirect, orphans };
}

/** parent_agent_id 체인 기준 root 하위 파트너 전원 (중첩 공식·제휴 포함) */
export function collectPartnerSubtreeIds(
  rootId: string,
  users: Array<{ id: string; role: string; parent_agent_id: string | null }>,
): Set<string> {
  const partnerRoles = new Set(["총판영업자", "하위영업자", "총괄공식파트너"]);
  const byParent = new Map<string, string[]>();

  for (const u of users) {
    if (!partnerRoles.has(u.role)) continue;
    const pid = u.parent_agent_id;
    if (!pid) continue;
    const list = byParent.get(pid) ?? [];
    list.push(u.id);
    byParent.set(pid, list);
  }

  const ids = new Set<string>([rootId]);
  const queue = [...(byParent.get(rootId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (ids.has(id)) continue;
    ids.add(id);
    queue.push(...(byParent.get(id) ?? []));
  }
  return ids;
}

/** parentAgentId 체인으로 특정 제휴파트너의 모든 후손 수집 */
export function collectAffiliateDescendants(
  rootId: string,
  affiliates: Array<{ id: string; parentAgentId: string | null }>,
): string[] {
  const byParent = new Map<string, string[]>();
  for (const a of affiliates) {
    const pid = a.parentAgentId;
    if (!pid) continue;
    const list = byParent.get(pid) ?? [];
    list.push(a.id);
    byParent.set(pid, list);
  }

  const out: string[] = [];
  const queue = [...(byParent.get(rootId) ?? [])];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    queue.push(...(byParent.get(id) ?? []));
  }

  return out;
}
