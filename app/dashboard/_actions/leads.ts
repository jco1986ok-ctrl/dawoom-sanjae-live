"use server";

import { isValidLeadStatus } from "@/lib/lead-status";
import { appendStatusChangeToNotes } from "@/lib/lead-consult-memos";
import type { ConsultComment } from "@/lib/lead-consult-memos";
import { insertLeadConsultComment } from "./lead-comments";
import { isDiseaseCategory, type DiseaseCategory } from "@/lib/disease-category";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

const STATUS_EDIT_ROLES: UserRole[] = ["관리자", "노무사", "대표노무사", "총괄공식파트너"];

const LEAD_DELETE_ROLES: UserRole[] = ["관리자", "총괄공식파트너"];

async function assertCanDeleteLead(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | undefined;
  if (!role || !LEAD_DELETE_ROLES.includes(role)) {
    return { ok: false, error: "접수 데이터 삭제 권한이 없습니다." };
  }

  return { ok: true };
}

async function assertCanEditLeadStatus(
  leadId: string,
): Promise<
  | { ok: true; role: UserRole; userId: string; authorName: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (!role || !STATUS_EDIT_ROLES.includes(role)) {
    return { ok: false, error: "상태 변경 권한이 없습니다." };
  }

  const authorName = (profile?.name as string | undefined)?.trim() || "알 수 없음";

  if (role === "노무사") {
    const adminClient = createAdminClient();
    const { data: lead } = await adminClient
      .from("leads")
      .select("assigned_to")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) return { ok: false, error: "접수 건을 찾을 수 없습니다." };
    if (lead.assigned_to !== user.id) {
      return { ok: false, error: "본인에게 배당된 사건만 수정할 수 있습니다." };
    }
  }

  return { ok: true, role, userId: user.id, authorName };
}

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
  const auth = await assertCanDeleteLead();
  if (!auth.ok) return { success: false, error: auth.error };

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
  newStatus: string,
): Promise<{ success: boolean; error?: string; notes?: string }> {
  if (!isValidLeadStatus(newStatus)) {
    return { success: false, error: "올바르지 않은 상태값입니다." };
  }

  const auth = await assertCanEditLeadStatus(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const adminClient = createAdminClient();
    const { data: lead, error: fetchError } = await adminClient
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

    const notes = appendStatusChangeToNotes(
      lead.notes as string | null,
      prevStatus,
      newStatus,
    );

    const { error } = await adminClient
      .from("leads")
      .update({ consultation_status: newStatus, notes })
      .eq("id", leadId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard", "layout");
    return { success: true, notes };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}

/** lead_comments 테이블에 상담 코멘트 저장 (작성자 실명 포함) */
export async function appendLeadConsultMemo(
  leadId: string,
  content: string,
): Promise<{ success: boolean; error?: string; comment?: ConsultComment }> {
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "메모 내용을 입력해 주세요." };

  const auth = await assertCanEditLeadStatus(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  const result = await insertLeadConsultComment(
    leadId,
    auth.userId,
    auth.authorName,
    trimmed,
  );

  if (result.success) {
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard-v2", "layout");
  }

  return result;
}

export async function updateLeadDiseaseCategory(
  leadId: string,
  category: DiseaseCategory | null,
): Promise<{ success: boolean; error?: string }> {
  if (category !== null && !isDiseaseCategory(category)) {
    return { success: false, error: "올바르지 않은 질병 카테고리입니다." };
  }

  const auth = await assertCanEditLeadStatus(leadId);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("leads")
      .update({ disease_category: category })
      .eq("id", leadId);

    if (error) {
      if (/disease_category/i.test(error.message ?? "")) {
        return {
          success: false,
          error: "DB에 disease_category 컬럼이 없습니다. 마이그레이션을 실행해 주세요.",
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}
