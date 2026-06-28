import {
  buildUserLineage,
  USER_ROLE_LABEL,
  type UserLineageNode,
} from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";

export type LineageUserRow = {
  id: string;
  name: string;
  agent_id: string;
  parent_agent_id: string | null;
  role: UserRole | string;
};

export function buildLineageUserMap(users: LineageUserRow[]) {
  const map: Record<string, LineageUserRow> = {};
  for (const u of users) {
    map[u.id] = u;
  }
  return map;
}

/** 고객 유입 계정 라인 (root → 담당 파트너) */
export function buildLeadLineage(
  partnerUserId: string | null | undefined,
  userMap: Record<string, LineageUserRow>,
): UserLineageNode[] {
  if (!partnerUserId || !userMap[partnerUserId]) return [];

  const mapForBuild: Record<
    string,
    {
      id: string;
      name: string;
      role: UserRole;
      agent_id: string;
      parent_agent_id: string | null;
    }
  > = {};

  for (const [id, u] of Object.entries(userMap)) {
    mapForBuild[id] = {
      id: u.id,
      name: u.name,
      role: u.role as UserRole,
      agent_id: u.agent_id,
      parent_agent_id: u.parent_agent_id,
    };
  }

  return buildUserLineage(partnerUserId, mapForBuild);
}

export function formatLeadLineageLabel(lineage: UserLineageNode[]): string {
  if (lineage.length === 0) return "유입 계정 미확인";
  return lineage
    .map((n) => `${USER_ROLE_LABEL[n.role] ?? n.role} ${n.name}`)
    .join(" → ");
}

export function formatLeadLineageShort(lineage: UserLineageNode[]): string {
  if (lineage.length === 0) return "미확인";
  const leaf = lineage[lineage.length - 1];
  if (lineage.length === 1) {
    return `${USER_ROLE_LABEL[leaf.role] ?? leaf.role} · ${leaf.name}`;
  }
  const root = lineage[0];
  return `${USER_ROLE_LABEL[root.role] ?? root.role} → … → ${leaf.name}`;
}
