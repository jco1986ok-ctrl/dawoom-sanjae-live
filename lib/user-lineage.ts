import type { UserRole } from "@/lib/types";

export interface UserLineageNode {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
  parent_agent_id: string | null;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
  is_active: boolean;
  parent_agent_id: string | null;
  parent_name: string | null;
  parent_role: UserRole | null;
  lineage: UserLineageNode[];
}

type UserMapEntry = {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
  parent_agent_id: string | null;
};

/** users 배열을 parent 정보 + 조직도 체인으로 enrich */
export function enrichUsersWithLineage(
  users: Array<{
    id: string;
    name: string;
    role: UserRole;
    agent_id: string;
    is_active: boolean;
    parent_agent_id: string | null;
  }>,
): AdminUserListItem[] {
  const userMap: Record<string, UserMapEntry> = {};
  for (const u of users) {
    userMap[u.id] = {
      id: u.id,
      name: u.name,
      role: u.role,
      agent_id: u.agent_id,
      parent_agent_id: u.parent_agent_id,
    };
  }

  return users.map((u) => {
    const parent = u.parent_agent_id ? userMap[u.parent_agent_id] : null;
    return {
      ...u,
      parent_name: parent?.name ?? null,
      parent_role: parent?.role ?? null,
      lineage: buildUserLineage(u.id, userMap),
    };
  });
}

/** root → current 순서의 조직도 체인 */
export function buildUserLineage(
  userId: string,
  userMap: Record<string, UserMapEntry>,
): UserLineageNode[] {
  const chain: UserLineageNode[] = [];
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = userMap[currentId];
    if (!u) break;

    chain.unshift({
      id: u.id,
      name: u.name,
      role: u.role,
      agent_id: u.agent_id,
      parent_agent_id: u.parent_agent_id,
    });

    currentId = u.parent_agent_id;
  }

  return chain;
}

export const USER_ROLE_LABEL: Record<string, string> = {
  총괄공식파트너: "총괄 파트너",
  총판영업자: "공식 파트너",
  하위영업자: "제휴 멤버",
  관리자: "관리자",
  노무사: "노무사",
  대표노무사: "대표 노무사",
};

/** 리스트 꼬리표: [유치자: OOO] 또는 [본사 직속] */
export function getRecruiterTag(user: AdminUserListItem): string {
  if (
    !user.parent_agent_id ||
    !user.parent_name ||
    user.parent_role === "관리자"
  ) {
    return "[본사 직속]";
  }
  return `[유치자: ${user.parent_name}]`;
}
