"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = ["신규", "연락대기", "상담중", "계약완료", "보류", "종결"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

export async function assignLead(
  leadId: string,
  assignedToId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("leads")
      .update({ assigned_to: assignedToId })
      .eq("id", leadId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}

export async function deleteLead(
  leadId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("leads")
      .delete()
      .eq("id", leadId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, error: "올바르지 않은 상태값입니다." };
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("leads")
      .update({ consultation_status: newStatus })
      .eq("id", leadId);

    if (error) return { success: false, error: error.message };

    // 모든 대시보드 경로 재검증 (변경 즉시 반영)
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}
