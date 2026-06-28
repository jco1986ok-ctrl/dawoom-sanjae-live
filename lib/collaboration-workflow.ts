import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { mapUserRoleToTestRole } from "@/lib/dashboard-rbac";
import type { UserRole } from "@/lib/types";
import type { AdminUserListItem } from "@/lib/user-lineage";

export const COLLABORATION_OWNER_ROLES = [
  "inside_staff",
  "field_manager",
  "attorney",
] as const;

export type CollaborationOwnerRole = (typeof COLLABORATION_OWNER_ROLES)[number];

export const COLLABORATION_OWNER_LABELS: Record<CollaborationOwnerRole, string> = {
  inside_staff: "내근",
  field_manager: "현장",
  attorney: "노무사",
};

export const COLLABORATION_OWNER_BADGE_CLASS: Record<CollaborationOwnerRole, string> = {
  inside_staff: "bg-sky-100 text-sky-800 border-sky-200",
  field_manager: "bg-amber-100 text-amber-900 border-amber-200",
  attorney: "bg-violet-100 text-violet-900 border-violet-200",
};

export type HandoffAction = {
  id: string;
  label: string;
  nextOwner: CollaborationOwnerRole;
  messageTemplate: string;
};

export const HANDOFF_ACTIONS: Record<CollaborationOwnerRole, HandoffAction[]> = {
  inside_staff: [
    {
      id: "request_field",
      label: "현장 출동 요청",
      nextOwner: "field_manager",
      messageTemplate: "새로운 현장 출동 요청이 도착했습니다",
    },
  ],
  field_manager: [
    {
      id: "request_attorney",
      label: "노무사 서면 작성 요청",
      nextOwner: "attorney",
      messageTemplate: "노무사 서면 작성 요청이 도착했습니다",
    },
  ],
  attorney: [
    {
      id: "return_inside",
      label: "내근으로 회신",
      nextOwner: "inside_staff",
      messageTemplate: "노무사 검토가 완료되어 내근 담당으로 회신되었습니다",
    },
  ],
};

/** V2 직책 테스트 → 협업 담당 역할 */
export function testRoleToCollaborationOwner(
  role: DashboardTestRole,
): CollaborationOwnerRole | null {
  if (role === "공식파트너" || role === "제휴파트너") return "field_manager";
  if (role === "노무사" || role === "대표노무사") return "attorney";
  if (role === "마스터") return "inside_staff";
  return null;
}

/** DB users.role → 협업 알림 수신 대상 역할 */
export function userRoleToCollaborationOwner(role: UserRole): CollaborationOwnerRole | null {
  return testRoleToCollaborationOwner(mapUserRoleToTestRole(role));
}

export function getUsersForCollaborationRole(
  targetRole: CollaborationOwnerRole,
  users: AdminUserListItem[],
): AdminUserListItem[] {
  return users.filter((u) => userRoleToCollaborationOwner(u.role as UserRole) === targetRole);
}

export function normalizeOwnerRole(
  value: string | null | undefined,
): CollaborationOwnerRole {
  if (value === "field_manager" || value === "attorney") return value;
  return "inside_staff";
}

export function buildHandoffMessage(
  template: string,
  customerName: string,
  fromLabel: string,
): string {
  return `${template} — ${customerName} (${fromLabel})`;
}
