"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";
import {
  ADMIN_ASSIGNABLE_ROLES,
  HEAD_PARTNER_ASSIGNABLE_ROLES,
  buildUserLineage,
  canDeleteUser,
  canEditUserRole,
  isInHeadPartnerNetwork,
} from "@/lib/user-role-permissions";
import { isValidParentRole } from "@/lib/partner-lineage";

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

export type DeleteUserResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function deleteUserAction(
  targetUserId: string,
): Promise<DeleteUserResult> {
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

  if (
    !callerProfile ||
    (callerProfile.role !== "관리자" && callerProfile.role !== "총괄공식파트너")
  ) {
    return { success: false, error: "계정 삭제 권한이 없습니다." };
  }

  const callerRole = callerProfile.role as UserRole;
  const callerId = callerProfile.id as string;
  if (targetUserId === callerId) {
    return { success: false, error: "본인 계정은 삭제할 수 없습니다." };
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

  if (!canDeleteUser(targetItem, callerRole, callerId)) {
    return { success: false, error: "이 계정은 삭제할 수 없습니다." };
  }

  const { count: childCount, error: childCountError } = await adminClient
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("parent_agent_id", targetUserId);

  if (childCountError) {
    return { success: false, error: `하위 조직 확인 실패: ${childCountError.message}` };
  }

  if ((childCount ?? 0) > 0) {
    return {
      success: false,
      error:
        "하위 제휴 파트너가 있는 조직원은 삭제할 수 없습니다. 하위 파트너를 먼저 삭제하거나 라인을 변경해 주세요.",
    };
  }

  const { error: profileDeleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", targetUserId);

  if (profileDeleteError) {
    return { success: false, error: `프로필 삭제 실패: ${profileDeleteError.message}` };
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

  if (authDeleteError) {
    return {
      success: false,
      error: `인증 계정 삭제 실패: ${authDeleteError.message}`,
    };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/head-partner");
  revalidatePath("/dashboard/head-attorney");
  revalidatePath("/dashboard/master");

  return { success: true, message: `${target.name}님 계정이 삭제되었습니다.` };
}

export type UpdateAffiliateParentResult =
  | { success: true; message: string }
  | { success: false; error: string };

/** 마스터(관리자)·총괄 파트너: 제휴 파트너 상위(계보) 변경 */
export async function updateAffiliateParentAction(
  affiliateUserId: string,
  newParentId: string,
): Promise<UpdateAffiliateParentResult> {
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

  const callerRole = callerProfile?.role as UserRole | undefined;
  if (!callerRole || (callerRole !== "관리자" && callerRole !== "총괄공식파트너")) {
    return { success: false, error: "상위 파트너 변경 권한이 없습니다." };
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

  const { data: affiliate, error: affiliateError } = await adminClient
    .from("users")
    .select("id, name, role, parent_agent_id")
    .eq("id", affiliateUserId)
    .single();

  if (affiliateError || !affiliate) {
    return { success: false, error: "제휴 파트너를 찾을 수 없습니다." };
  }

  if ((affiliate.role as UserRole) !== "하위영업자") {
    return { success: false, error: "제휴 파트너(하위영업자)만 계보를 변경할 수 있습니다." };
  }

  if (callerRole === "총괄공식파트너") {
    const affiliateLineage = buildUserLineage(affiliateUserId, userMap);
    const affiliateItem = {
      ...userMap[affiliateUserId],
      is_active: true,
      parent_name: affiliate.parent_agent_id
        ? userMap[affiliate.parent_agent_id]?.name ?? null
        : null,
      parent_role: affiliate.parent_agent_id
        ? (userMap[affiliate.parent_agent_id]?.role ?? null)
        : null,
      lineage: affiliateLineage,
    };
    if (!isInHeadPartnerNetwork(affiliateItem, callerAuth.id)) {
      return {
        success: false,
        error: "본인 네트워크 소속 제휴 파트너만 계보를 변경할 수 있습니다.",
      };
    }
  }

  const { data: newParent, error: parentError } = await adminClient
    .from("users")
    .select("id, name, role, is_active")
    .eq("id", newParentId)
    .single();

  if (parentError || !newParent) {
    return { success: false, error: "변경할 상위 파트너를 찾을 수 없습니다." };
  }

  const parentRole = newParent.role as UserRole;
  if (!isValidParentRole(parentRole)) {
    return { success: false, error: "상위 파트너는 공식 파트너 또는 총괄 파트너만 선택할 수 있습니다." };
  }

  if (callerRole === "총괄공식파트너" && newParentId !== callerAuth.id) {
    const parentLineage = buildUserLineage(newParentId, userMap);
    const parentItem = {
      ...userMap[newParentId],
      is_active: newParent.is_active ?? true,
      parent_name: userMap[newParentId]?.parent_agent_id
        ? userMap[userMap[newParentId].parent_agent_id!]?.name ?? null
        : null,
      parent_role: userMap[newParentId]?.parent_agent_id
        ? (userMap[userMap[newParentId].parent_agent_id!]?.role ?? null)
        : null,
      lineage: parentLineage,
    };
    if (
      parentRole !== "총판영업자" ||
      !isInHeadPartnerNetwork(parentItem, callerAuth.id)
    ) {
      return {
        success: false,
        error: "본인 또는 본인 산하 공식 파트너만 상위로 지정할 수 있습니다.",
      };
    }
  }

  if (!newParent.is_active) {
    return { success: false, error: "비활성화된 파트너는 상위로 지정할 수 없습니다." };
  }

  if (affiliate.parent_agent_id === newParentId) {
    return { success: false, error: "이미 선택한 상위 파트너입니다." };
  }

  const { error: updateError } = await adminClient
    .from("users")
    .update({ parent_agent_id: newParentId })
    .eq("id", affiliateUserId);

  if (updateError) {
    return { success: false, error: `상위 파트너 변경 실패: ${updateError.message}` };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/head-attorney");
  revalidatePath("/dashboard/head-partner");

  return {
    success: true,
    message: `${affiliate.name}님의 상위 파트너가 ${newParent.name}님으로 변경되었습니다.`,
  };
}
