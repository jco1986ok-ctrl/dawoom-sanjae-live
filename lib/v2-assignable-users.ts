import type { UserRole } from "@/lib/types";
import type { AdminUserListItem } from "@/lib/user-lineage";

/** DB users.role — 담당자(Assignee) 배정 드롭다운에 표시할 직책 */
export const V2_ASSIGNEE_DB_ROLES: readonly UserRole[] = [
  "관리자",
  "총괄공식파트너",
  "대표노무사",
  "노무사",
] as const;

/** UI·문서용 별칭 (master → 관리자, 총괄파트너 → 총괄공식파트너) */
const ASSIGNEE_ROLE_ALIASES: Record<string, UserRole> = {
  master: "관리자",
  마스터: "관리자",
  관리자: "관리자",
  총괄파트너: "총괄공식파트너",
  총괄공식파트너: "총괄공식파트너",
  대표노무사: "대표노무사",
  노무사: "노무사",
};

export function normalizeV2AssignableRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  const trimmed = role.trim();
  if ((V2_ASSIGNEE_DB_ROLES as readonly string[]).includes(trimmed)) {
    return trimmed as UserRole;
  }
  return ASSIGNEE_ROLE_ALIASES[trimmed] ?? null;
}

export function isV2AssignableRole(role: string | null | undefined): boolean {
  return normalizeV2AssignableRole(role) !== null;
}

/** 담당자 Select — 활성 사용자 중 배정 가능 직책만, 이름 가나다순 */
export function filterV2AssignableUsers(users: AdminUserListItem[]): AdminUserListItem[] {
  return users
    .filter((u) => u.is_active && isV2AssignableRole(u.role))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
