import type { UserRole } from "@/lib/types";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { buildUserLineage, USER_ROLE_LABEL } from "@/lib/user-lineage";

/** 관리자가 부여 가능한 권한 (관리자 제외) */
export const ADMIN_ASSIGNABLE_ROLES: UserRole[] = [
  "총괄공식파트너",
  "총판영업자",
  "하위영업자",
  "대표노무사",
  "노무사",
];

/** 총괄 파트너가 부여 가능한 권한 */
export const HEAD_PARTNER_ASSIGNABLE_ROLES: UserRole[] = ["총판영업자", "하위영업자"];

export { buildUserLineage, USER_ROLE_LABEL };

/** 총괄 파트너 라인 소속 여부 (본인 제외) */
export function isInHeadPartnerNetwork(
  user: AdminUserListItem,
  headPartnerId: string,
): boolean {
  if (user.id === headPartnerId) return false;
  if (user.role === "관리자" || user.role === "대표노무사" || user.role === "노무사") {
    return false;
  }
  if (user.role === "총괄공식파트너") return false;
  return user.lineage.some((node) => node.id === headPartnerId);
}

/** UI/서버 공통: 대상 유저 권한 변경 가능 여부 */
export function canEditUserRole(
  target: AdminUserListItem,
  viewerRole: UserRole,
  viewerId: string,
): boolean {
  if (target.id === viewerId) return false;
  if (target.role === "관리자") return false;

  if (viewerRole === "관리자") {
    return target.id !== viewerId && target.role !== "관리자";
  }

  if (viewerRole === "총괄공식파트너") {
    return isInHeadPartnerNetwork(target, viewerId);
  }

  return false;
}

export function getAssignableRoles(viewerRole: UserRole): UserRole[] {
  if (viewerRole === "관리자") return ADMIN_ASSIGNABLE_ROLES;
  if (viewerRole === "총괄공식파트너") return HEAD_PARTNER_ASSIGNABLE_ROLES;
  return [];
}

/** 관리자·총괄 파트너: 파트너·노무사 계정 삭제 (본인·관리자·타 총괄 제외, 총괄은 산하 네트워크만) */
export function canDeleteUser(
  target: AdminUserListItem,
  viewerRole: UserRole,
  viewerId: string,
): boolean {
  if (target.id === viewerId) return false;
  if (target.role === "관리자") return false;

  if (viewerRole === "관리자") return true;

  if (viewerRole === "총괄공식파트너") {
    if (
      target.role === "총괄공식파트너" ||
      target.role === "대표노무사" ||
      target.role === "노무사" ||
      target.role === "관리자"
    ) {
      return false;
    }
    return isInHeadPartnerNetwork(target, viewerId);
  }

  return false;
}
