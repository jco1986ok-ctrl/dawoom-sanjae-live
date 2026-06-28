"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDashboardV2MasterRole } from "@/lib/dashboard-v2-access";
import { isV2ProcessingHandlerRole } from "@/lib/v2-assignable-users";
import { appendAssignmentLogToNotes } from "@/lib/lead-consult-memos";

async function requireV2Access() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." as const };

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (!profile || !isDashboardV2MasterRole(profile.role as string)) {
    return { error: "V2 테스트 보드 접근 권한이 없습니다." as const };
  }

  return { user, profile };
}

export async function assignLeadUser(
  leadId: string,
  assignedUserId: string,
  memo: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireV2Access();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!assignedUserId?.trim()) {
    return { success: false, error: "담당자를 선택해 주세요." };
  }

  const admin = createAdminClient();
  const { data: assignee } = await admin
    .from("users")
    .select("id, name, role")
    .eq("id", assignedUserId)
    .maybeSingle();

  if (!assignee) {
    return { success: false, error: "선택한 담당자를 찾을 수 없습니다." };
  }

  if (!isV2ProcessingHandlerRole(assignee.role as string)) {
    return {
      success: false,
      error: "배정 가능한 처리 담당자(마스터·총괄·대표노무사·노무사)만 선택할 수 있습니다.",
    };
  }

  const trimmedMemo = memo.trim();
  const { data: leadRow } = await admin
    .from("leads")
    .select("notes")
    .eq("id", leadId)
    .maybeSingle();

  const nextNotes = appendAssignmentLogToNotes(
    leadRow?.notes as string | null | undefined,
    assignee.name as string,
    trimmedMemo || null,
  );

  const { error } = await admin
    .from("leads")
    .update({
      assigned_user_id: assignedUserId,
      assignment_memo: trimmedMemo || null,
      is_read: false,
      notes: nextNotes,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    if (/assigned_user_id|assignment_memo|is_read/i.test(error.message ?? "")) {
      return {
        success: false,
        error: "DB 마이그레이션이 필요합니다. supabase/25_v2_assignment.sql 을 실행해 주세요.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard-v2");
  revalidatePath("/dashboard-v2/my-board");
  revalidatePath("/dashboard/my-board");
  return { success: true };
}

export async function markLeadAssignmentRead(
  leadId: string,
  viewerUserId?: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireV2Access();
  if ("error" in auth) return { success: false, error: auth.error };

  const readerId = viewerUserId ?? auth.user.id;
  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("assigned_user_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { success: false, error: "접수 건을 찾을 수 없습니다." };

  if (lead.assigned_user_id && lead.assigned_user_id !== readerId) {
    return { success: true };
  }

  const { error } = await admin
    .from("leads")
    .update({ is_read: true })
    .eq("id", leadId);

  if (error) {
    if (/is_read/i.test(error.message ?? "")) return { success: true };
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard-v2");
  return { success: true };
}
