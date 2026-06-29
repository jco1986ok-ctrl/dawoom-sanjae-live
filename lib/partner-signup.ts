import type { UserRole } from "@/lib/types";

/** 초대 링크 가입 시 부여되는 유일한 DB 역할 (UI: 제휴파트너 / 제휴 멤버) */
export const PARTNER_SIGNUP_ROLE = "하위영업자" as const satisfies UserRole;

/** 가입 경로로 절대 부여되면 안 되는 역할 */
export const PARTNER_SIGNUP_FORBIDDEN_ROLES: readonly UserRole[] = [
  "관리자",
  "대표노무사",
  "총괄공식파트너",
  "총판영업자",
  "노무사",
  "일반팀원",
] as const;

export function assertPartnerSignupRole(role: string): asserts role is typeof PARTNER_SIGNUP_ROLE {
  if (role !== PARTNER_SIGNUP_ROLE) {
    throw new Error(`PARTNER_SIGNUP_INVALID_ROLE:${role}`);
  }
}

export function buildPartnerSignupUserRow(input: {
  id: string;
  name: string;
  agentId: string;
  inviterUserId: string;
  inviteAgentCode: string;
}): {
  id: string;
  name: string;
  role: typeof PARTNER_SIGNUP_ROLE;
  agent_id: string;
  parent_agent_id: string;
  invited_by_user_id: string;
  invited_by_agent_code: string;
  is_active: boolean;
} {
  const role = PARTNER_SIGNUP_ROLE;
  assertPartnerSignupRole(role);

  return {
    id: input.id,
    name: input.name,
    role,
    agent_id: input.agentId,
    parent_agent_id: input.inviterUserId,
    invited_by_user_id: input.inviterUserId,
    invited_by_agent_code: input.inviteAgentCode,
    is_active: true,
  };
}

/** ?invite= / ?ref= / 폼 hidden 필드에서 초대 코드 추출 */
export function resolvePartnerInviteCode(
  invite?: string | null,
  ref?: string | null,
): string {
  return (invite?.trim() || ref?.trim() || "").toUpperCase();
}
