"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";
import {
  ADMIN_ASSIGNABLE_ROLES,
  HEAD_PARTNER_ASSIGNABLE_ROLES,
  buildUserLineage,
  canEditUserRole,
} from "@/lib/user-role-permissions";

export type UpdateUserRoleResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole,
): Promise<UpdateUserRoleResult> {
  const supabase = await createClient();
  const {
    data: { user: callerAuth },
  } = await supabase.auth.getUser();

  if (!callerAuth) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", callerAuth.id)
    .single();

  if (!callerProfile) {
    return { success: false, error: "프로필을 찾을 수 없습니다." };
  }

  const callerRole = callerProfile.role as UserRole;
  const callerId = callerProfile.id as string;

  if (callerRole !== "관리자" && callerRole !== "총괄공식파트너") {
    return { success: false, error: "권한 변경 권한이 없습니다." };
  }

  const adminClient = createAdminClient();

  const { data: allRaw = [] } = await adminClient
    .from("users")
    .select("id, name, role, agent_id, is_active, parent_agent_id");

  const userMap: Record<
    string,
    {
      id: string;
      name: string;
      role: UserRole;
      agent_id: string;
      parent_agent_id: string | null;
    }
  > = {};

  for (const u of allRaw) {
    userMap[u.id as string] = {
      id: u.id as string,
      name: u.name as string,
      role: u.role as UserRole,
      agent_id: u.agent_id as string,
      parent_agent_id: u.parent_agent_id as string | null,
    };
  }

  const target = userMap[targetUserId];
  if (!target) {
    return { success: false, error: "대상 사용자를 찾을 수 없습니다." };
  }

  const targetLineage = buildUserLineage(targetUserId, userMap);
  const targetItem = {
    ...target,
    is_active: true,
    parent_name: target.parent_agent_id ? userMap[target.parent_agent_id]?.name ?? null : null,
    parent_role: target.parent_agent_id
      ? (userMap[target.parent_agent_id]?.role ?? null)
      : null,
    lineage: targetLineage,
  };

  if (!canEditUserRole(targetItem, callerRole, callerId)) {
    return { success: false, error: "이 사용자의 권한을 변경할 수 없습니다." };
  }

  const allowedRoles =
    callerRole === "관리자" ? ADMIN_ASSIGNABLE_ROLES : HEAD_PARTNER_ASSIGNABLE_ROLES;

  if (!allowedRoles.includes(newRole)) {
    return {
      success: false,
      error:
        callerRole === "총괄공식파트너"
          ? "총괄 파트너는 공식 파트너·제휴 멤버만 부여할 수 있습니다."
          : "허용되지 않은 권한입니다.",
    };
  }

  const updatePayload: { role: UserRole; parent_agent_id?: string | null } = {
    role: newRole,
  };

  if (callerRole === "총괄공식파트너" && newRole === "총판영업자") {
    updatePayload.parent_agent_id = callerId;
  }

  if (callerRole === "관리자") {
    if (newRole === "총괄공식파트너" || newRole === "대표노무사" || newRole === "노무사") {
      updatePayload.parent_agent_id = null;
    }
  }

  const { error: updateError } = await adminClient
    .from("users")
    .update(updatePayload)
    .eq("id", targetUserId);

  if (updateError) {
    return { success: false, error: `권한 변경 실패: ${updateError.message}` };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/head-partner");

  return {
    success: true,
    message: `${target.name}님의 권한이 변경되었습니다.`,
  };
}
