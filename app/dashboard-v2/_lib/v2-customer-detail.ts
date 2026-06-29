import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import {
  buildCustomerDetailRow,
  type CustomerDetailRow,
} from "@/app/dashboard/_components/CustomerDetailModal";
import { normalizeOwnerRole } from "@/lib/collaboration-workflow";
import { normalizeV2LeadStatus } from "@/lib/v2-lead-status";
import { getLeadLastUpdatedAt } from "@/lib/v2-task-aging";

export type V2CustomerDetailRow = CustomerDetailRow & {
  currentOwnerRole: ReturnType<typeof normalizeOwnerRole>;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignmentMemo: string | null;
  isRead: boolean;
  lastUpdatedAt: string;
  callbackDate: string | null;
};

export function buildV2CustomerDetailRow(
  lead: LeadDetail,
  users?: AdminUserListItem[],
): V2CustomerDetailRow {
  const assignedUserId = lead.assigned_user_id ?? null;
  const assignedUserName =
    lead.assigned_user_name ??
    (assignedUserId && users
      ? (users.find((u) => u.id === assignedUserId)?.name ?? null)
      : null);

  return {
    ...buildCustomerDetailRow(lead),
    consultationStatus: normalizeV2LeadStatus(lead.consultation_status),
    currentOwnerRole: normalizeOwnerRole(lead.current_owner_role),
    assignedUserId,
    assignedUserName,
    assignmentMemo: lead.assignment_memo ?? null,
    isRead: lead.is_read !== false,
    lastUpdatedAt: getLeadLastUpdatedAt(lead),
    callbackDate: lead.callback_date ?? null,
  };
}
