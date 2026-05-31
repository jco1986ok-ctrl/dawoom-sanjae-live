"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

export type PartnerSignupResult =
  | { success: true; message: string; agentId: string }
  | { success: false; error: string };

const INVITER_ROLES: UserRole[] = ["관리자", "총괄공식파트너", "총판영업자", "하위영업자"];

/** 초대 링크 가입 시 부여되는 유일한 권한 (UI 표기: 제휴 멤버). 클라이언트에서 변경 불가. */
const SIGNUP_FIXED_ROLE = "하위영업자" as const satisfies UserRole;

function generateAgentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AG-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function partnerSignupAction(
  prevState: PartnerSignupResult | null,
  formData: FormData,
): Promise<PartnerSignupResult> {
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string)?.trim() ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const inviteCode = (formData.get("invite") as string)?.trim() ?? "";

  // 보안: role 필드 조작 시도 차단 (가입 권한은 서버에서만 SIGNUP_FIXED_ROLE로 고정)
  if (formData.get("role")) {
    return { success: false, error: "잘못된 요청입니다." };
  }

  if (!email || !password || !confirmPassword || !name || !inviteCode) {
    return { success: false, error: "모든 필수 항목을 입력해 주세요." };
  }
  if (password.length < 8) {
    return { success: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== confirmPassword) {
    return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
  }

  const adminClient = createAdminClient();

  // agent_id 대소문자·공백 차이 허용
  const normalizedInvite = inviteCode.trim().toUpperCase();

  const { data: inviter, error: inviterError } = await adminClient
    .from("users")
    .select("id, name, role, is_active, agent_id")
    .ilike("agent_id", normalizedInvite)
    .maybeSingle();

  if (inviterError || !inviter) {
    return { success: false, error: "유효하지 않은 초대 링크입니다." };
  }
  if (!inviter.is_active) {
    return { success: false, error: "비활성화된 초대 링크입니다." };
  }
  if (!INVITER_ROLES.includes(inviter.role as UserRole)) {
    return { success: false, error: "파트너 초대 권한이 없는 링크입니다." };
  }

  let agentId = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateAgentId();
    const { data: exists } = await adminClient
      .from("users")
      .select("id")
      .eq("agent_id", candidate)
      .maybeSingle();
    if (!exists) {
      agentId = candidate;
      break;
    }
  }
  if (!agentId) {
    return { success: false, error: "파트너 코드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !newAuthUser?.user) {
    return { success: false, error: authError?.message ?? "계정 생성에 실패했습니다." };
  }

  const newUserId = newAuthUser.user.id;

  const { error: insertError } = await adminClient.from("users").insert({
    id: newUserId,
    name,
    role: SIGNUP_FIXED_ROLE,
    agent_id: agentId,
    parent_agent_id: inviter.id,
    is_active: true,
  });

  if (insertError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    return { success: false, error: `프로필 저장 실패: ${insertError.message}` };
  }

  return {
    success: true,
    agentId,
    message:
      inviter.role === "관리자"
        ? "본사 직속 제휴 멤버 계정이 생성되었습니다."
        : `${inviter.name} 파트너님의 초대로 제휴 멤버 계정이 생성되었습니다.`,
  };
}
