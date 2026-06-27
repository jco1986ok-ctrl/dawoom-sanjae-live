"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidV2LeadStatus } from "@/lib/v2-lead-status";
import { isV2AssignableRole } from "@/lib/v2-assignable-users";

async function requireAssignee(
  leadId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("assigned_user_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "접수 건을 찾을 수 없습니다." };
  if (lead.assigned_user_id !== user.id) {
    return { ok: false, error: "본인에게 배정된 사건만 변경할 수 있습니다." };
  }

  return { ok: true, userId: user.id };
}

export async function updateMyBoardLeadStatus(
  leadId: string,
  newStatus: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAssignee(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!isValidV2LeadStatus(newStatus)) {
    return { success: false, error: "올바르지 않은 상태값입니다." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("leads")
    .update({
      consultation_status: newStatus,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/my-board");
  revalidatePath("/dashboard-v2");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function handoffMyBoardLead(
  leadId: string,
  nextAssigneeId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAssignee(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!nextAssigneeId?.trim()) {
    return { success: false, error: "다음 담당자를 선택해 주세요." };
  }

  const admin = createAdminClient();
  const { data: assignee } = await admin
    .from("users")
    .select("id, role")
    .eq("id", nextAssigneeId)
    .maybeSingle();

  if (!assignee) {
    return { success: false, error: "선택한 담당자를 찾을 수 없습니다." };
  }

  if (!isV2AssignableRole(assignee.role as string)) {
    return { success: false, error: "배정 가능한 직원만 선택할 수 있습니다." };
  }

  const { error } = await admin
    .from("leads")
    .update({
      assigned_user_id: nextAssigneeId,
      is_read: false,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/my-board");
  revalidatePath("/dashboard-v2");
  revalidatePath("/dashboard");
  return { success: true };
}
