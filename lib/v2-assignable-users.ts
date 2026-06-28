import type { UserRole } from "@/lib/types";
import type { AdminUserListItem } from "@/lib/user-lineage";

/**
 * 고객 처리 담당자로 배정·이관 가능한 DB 역할
 * (마스터·총괄파트너·대표노무사·노무사 — 내근 실무는 노무사 계정으로 배정)
 */
export const V2_PROCESSING_HANDLER_DB_ROLES: readonly UserRole[] = [
  "관리자",
  "총괄공식파트너",
  "대표노무사",
  "노무사",
] as const;

/** @deprecated V2_PROCESSING_HANDLER_DB_ROLES 와 동일 */
export const V2_ASSIGNEE_DB_ROLES = V2_PROCESSING_HANDLER_DB_ROLES;

/** @deprecated V2_PROCESSING_HANDLER_DB_ROLES 와 동일 */
export const V2_PROCESSING_HANDLER_ROLES = V2_PROCESSING_HANDLER_DB_ROLES;

const PROCESSING_HANDLER_ROLE_ALIASES: Record<string, UserRole> = {
  master: "관리자",
  마스터: "관리자",
  관리자: "관리자",
  총괄파트너: "총괄공식파트너",
  총괄공식파트너: "총괄공식파트너",
  대표노무사: "대표노무사",
  노무사: "노무사",
};

export function normalizeV2ProcessingHandlerRole(
  role: string | null | undefined,
): UserRole | null {
  if (!role) return null;
  const trimmed = role.trim();
  if ((V2_PROCESSING_HANDLER_DB_ROLES as readonly string[]).includes(trimmed)) {
    return trimmed as UserRole;
  }
  return PROCESSING_HANDLER_ROLE_ALIASES[trimmed] ?? null;
}

/** @deprecated normalizeV2ProcessingHandlerRole 사용 */
export function normalizeV2AssignableRole(role: string | null | undefined): UserRole | null {
  return normalizeV2ProcessingHandlerRole(role);
}

export function isV2ProcessingHandlerRole(role: string | null | undefined): boolean {
  return normalizeV2ProcessingHandlerRole(role) !== null;
}

/** @deprecated isV2ProcessingHandlerRole 사용 */
export function isV2AssignableRole(role: string | null | undefined): boolean {
  return isV2ProcessingHandlerRole(role);
}

/** 처리 담당자 목록 — 이름만 표시(가나다순), 직책 라벨 없음 */
export function filterV2ProcessingHandlerUsers(
  users: AdminUserListItem[],
): AdminUserListItem[] {
  return users
    .filter((u) => u.is_active && isV2ProcessingHandlerRole(u.role))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** @deprecated filterV2ProcessingHandlerUsers 사용 */
export function filterV2AssignableUsers(users: AdminUserListItem[]): AdminUserListItem[] {
  return filterV2ProcessingHandlerUsers(users);
}
