"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

export type CreateUserResult =
  | { success: true; message: string; agentId: string }
  | { success: false; error: string };

/** 관리자(MASTER) 수동 생성 시 부여 가능 — 관리자 역할 제외 */
export const MASTER_CREATE_ROLES: UserRole[] = [
  "총괄공식파트너",
  "총판영업자",
  "하위영업자",
  "대표노무사",
  "노무사",
];

/** 역할별 생성 가능한 하위 역할 */
const ALLOWED_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  관리자:         MASTER_CREATE_ROLES,
  총괄공식파트너: ["총판영업자", "하위영업자", "노무사"],
  총판영업자:     ["하위영업자"],
};

/** 영문 대문자 + 숫자 6자리 랜덤 코드 생성 (접두사 AG-) */
function generateAgentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AG-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createUserAction(
  prevState: CreateUserResult | null,
  formData: FormData,
): Promise<CreateUserResult> {
  // ── 1. 호출자 인증 및 권한 확인 ───────────────────────────
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();

  if (!caller) return { success: false, error: "로그인이 필요합니다." };

  const { data: callerProfile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", caller.id)
    .single();

  const callerRole = callerProfile?.role as UserRole | undefined;
  if (!callerRole || !ALLOWED_ROLES[callerRole]) {
    return { success: false, error: "계정 생성 권한이 없습니다." };
  }

  // ── 2. 폼 값 추출 ─────────────────────────────────────────
  const email         = (formData.get("email")          as string).trim();
  const password      = (formData.get("password")       as string).trim();
  const name          = (formData.get("name")            as string).trim();
  const role          = (formData.get("role")            as string).trim() as UserRole;
  const parentAgentId = (formData.get("parent_agent_id") as string | null)?.trim() ?? "";

  if (!email || !password || !name || !role) {
    return { success: false, error: "모든 필수 항목을 입력해 주세요." };
  }
  if (password.length < 8) {
    return { success: false, error: "비밀번호는 8자 이상이어야 합니다." };
  }

  // ── 3. 요청 역할이 허용 범위인지 검증 ──────────────────────
  const allowed = ALLOWED_ROLES[callerRole] ?? [];
  if (!allowed.includes(role)) {
    return {
      success: false,
      error: `'${callerRole}' 계급은 '${role}' 계정을 생성할 수 없습니다.`,
    };
  }

  // ── 4. parent_agent_id 결정 ───────────────────────────────
  const adminClient = createAdminClient();
  let resolvedParentId: string | null = null;

  if (role === "하위영업자") {
    // 제휴멤버: 지정된 부모(공식파트너 or 총괄파트너) 필수
    const effectiveParent = parentAgentId || callerProfile!.id;
    const { data: parent } = await adminClient
      .from("users")
      .select("id, role")
      .eq("id", effectiveParent)
      .in("role", ["총판영업자", "총괄공식파트너"])
      .maybeSingle();
    if (!parent) {
      return { success: false, error: "직속 파트너를 선택해 주세요." };
    }
    resolvedParentId = parent.id;
  } else if (role === "총판영업자") {
    // 공식파트너: 부모는 총괄파트너(생성자) 또는 관리자가 지정
    const effectiveParent = parentAgentId || callerProfile!.id;
    if (effectiveParent && effectiveParent !== callerProfile!.id) {
      const { data: parent } = await adminClient
        .from("users")
        .select("id")
        .eq("id", effectiveParent)
        .eq("role", "총괄공식파트너")
        .maybeSingle();
      resolvedParentId = parent?.id ?? null;
    } else if (callerRole === "총괄공식파트너") {
      resolvedParentId = callerProfile!.id;
    }
  }
  // 총괄공식파트너·관리자·노무사는 parent_agent_id = null

  // ── 5. agent_id 자동 생성 (중복 시 최대 10회 재시도) ──────
  let agentId = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateAgentId();
    const { data: exists } = await adminClient
      .from("users")
      .select("id")
      .eq("agent_id", candidate)
      .maybeSingle();
    if (!exists) { agentId = candidate; break; }
  }
  if (!agentId) {
    return { success: false, error: "코드 생성 실패. 잠시 후 다시 시도해 주세요." };
  }

  // ── 6. Supabase Auth 유저 생성 ────────────────────────────
  const { data: newAuthUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
    });

  if (authError || !newAuthUser?.user) {
    return { success: false, error: authError?.message ?? "Auth 유저 생성에 실패했습니다." };
  }

  const newUserId = newAuthUser.user.id;

  // ── 7. public.users 테이블 삽입 ───────────────────────────
  const { error: insertError } = await adminClient.from("users").insert({
    id:              newUserId,
    name,
    role,
    agent_id:        agentId,
    parent_agent_id: resolvedParentId,
    is_active:       true,
  });

  if (insertError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    return { success: false, error: `프로필 저장 실패: ${insertError.message}` };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/head-partner");
  revalidatePath("/dashboard/master");

  return {
    success: true,
    agentId,
    message: `${name} 계정이 생성됐습니다. 파트너 코드: ${agentId}`,
  };
}
