"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDashboardV2MasterRole } from "@/lib/dashboard-v2-access";
import {
  buildHandoffMessage,
  COLLABORATION_OWNER_LABELS,
  getUsersForCollaborationRole,
  type CollaborationOwnerRole,
  type HandoffAction,
  HANDOFF_ACTIONS,
  normalizeOwnerRole,
} from "@/lib/collaboration-workflow";
import type { AdminUserListItem } from "@/lib/user-lineage";

export type V2Notification = {
  id: string;
  leadId: string | null;
  kind: string;
  message: string;
  targetOwnerRole: CollaborationOwnerRole | null;
  readAt: string | null;
  createdAt: string;
};

async function requireV2Master() {
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

export async function handoffLeadOwner(
  leadId: string,
  actionId: string,
): Promise<{ success: boolean; nextOwner?: CollaborationOwnerRole; error?: string }> {
  const auth = await requireV2Master();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("id, customer_name, current_owner_role")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return { success: false, error: "접수 건을 찾을 수 없습니다." };
  }

  const currentOwner = normalizeOwnerRole(lead.current_owner_role);
  const actions = HANDOFF_ACTIONS[currentOwner];
  const action = actions.find((a) => a.id === actionId);
  if (!action) {
    return { success: false, error: "현재 담당자에게 허용되지 않은 바통 터치입니다." };
  }

  const { error: updateError } = await admin
    .from("leads")
    .update({ current_owner_role: action.nextOwner })
    .eq("id", leadId);

  if (updateError) {
    if (/current_owner_role/i.test(updateError.message ?? "")) {
      return {
        success: false,
        error: "DB에 current_owner_role 컬럼이 없습니다. supabase/24_collaboration_workflow.sql 마이그레이션을 실행해 주세요.",
      };
    }
    return { success: false, error: updateError.message };
  }

  const { data: allUsers } = await admin.from("users").select("id, name, role");
  const recipients = getUsersForCollaborationRole(
    action.nextOwner,
    (allUsers ?? []) as AdminUserListItem[],
  ).filter((u) => u.id !== auth.user.id);

  const fromLabel = COLLABORATION_OWNER_LABELS[currentOwner];
  const message = buildHandoffMessage(action.messageTemplate, lead.customer_name, fromLabel);

  if (recipients.length > 0) {
    const rows = recipients.map((u) => ({
      user_id: u.id,
      lead_id: leadId,
      kind: "handoff",
      message,
      from_user_id: auth.user.id,
      target_owner_role: action.nextOwner,
    }));

    const { error: notifyError } = await admin.from("notifications").insert(rows);
    if (notifyError && !/notifications|does not exist/i.test(notifyError.message ?? "")) {
      console.error("[handoffLeadOwner] notification insert:", notifyError);
    }
  }

  revalidatePath("/dashboard-v2");
  return { success: true, nextOwner: action.nextOwner };
}

export async function fetchV2Notifications(): Promise<{
  notifications: V2Notification[];
  unreadCount: number;
  error?: string;
}> {
  const auth = await requireV2Master();
  if ("error" in auth) {
    return { notifications: [], unreadCount: 0, error: auth.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, lead_id, kind, message, target_owner_role, read_at, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (/notifications|does not exist/i.test(error.message ?? "")) {
      return { notifications: [], unreadCount: 0 };
    }
    return { notifications: [], unreadCount: 0, error: error.message };
  }

  const notifications: V2Notification[] = (data ?? []).map((row) => ({
    id: row.id as string,
    leadId: (row.lead_id as string | null) ?? null,
    kind: row.kind as string,
    message: row.message as string,
    targetOwnerRole: (row.target_owner_role as CollaborationOwnerRole | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  return { notifications, unreadCount };
}

export async function markV2NotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireV2Master();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function markAllV2NotificationsRead(): Promise<{ success: boolean; error?: string }> {
  const auth = await requireV2Master();
  if ("error" in auth) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .is("read_at", null);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
