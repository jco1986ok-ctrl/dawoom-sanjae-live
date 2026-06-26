"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidLeadStatus } from "@/lib/lead-status";
import { appendV2StatusChangeWithReasonToNotes } from "@/lib/lead-consult-memos";
import type { UserRole } from "@/lib/types";

const STATUS_EDIT_ROLES: UserRole[] = ["관리자", "노무사", "대표노무사", "총괄공식파트너"];

async function assertCanEditLeadStatus(
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (!role || !STATUS_EDIT_ROLES.includes(role)) {
    return { ok: false, error: "상태 변경 권한이 없습니다." };
  }

  if (role === "노무사") {
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from("leads")
      .select("assigned_to")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) return { ok: false, error: "접수 건을 찾을 수 없습니다." };
    if (lead.assigned_to !== user.id) {
      return { ok: false, error: "본인에게 배당된 사건만 수정할 수 있습니다." };
    }
  }

  return { ok: true };
}

export async function updateV2LeadStatusWithReason(
  leadId: string,
  newStatus: string,
  reason: string,
): Promise<{ success: boolean; error?: string; notes?: string }> {
  const auth = await assertCanEditLeadStatus(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { success: false, error: "변경 사유를 입력해 주세요." };
  }

  if (!isValidLeadStatus(newStatus)) {
    return { success: false, error: "올바르지 않은 상태값입니다." };
  }

  const admin = createAdminClient();
  const { data: lead, error: fetchError } = await admin
    .from("leads")
    .select("consultation_status, notes")
    .eq("id", leadId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!lead) return { success: false, error: "접수 건을 찾을 수 없습니다." };

  const prevStatus = lead.consultation_status as string;
  if (prevStatus === newStatus) {
    return { success: true, notes: (lead.notes as string | null) ?? undefined };
  }

  const notes = appendV2StatusChangeWithReasonToNotes(
    lead.notes as string | null,
    prevStatus,
    newStatus,
    trimmedReason,
  );

  const { error } = await admin
    .from("leads")
    .update({ consultation_status: newStatus, notes })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard-v2");
  return { success: true, notes };
}
