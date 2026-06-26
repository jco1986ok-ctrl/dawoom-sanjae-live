import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import {
  buildCustomerDetailRow,
  type CustomerDetailRow,
} from "@/app/dashboard/_components/CustomerDetailModal";
import { normalizeOwnerRole } from "@/lib/collaboration-workflow";

export type V2CustomerDetailRow = CustomerDetailRow & {
  currentOwnerRole: ReturnType<typeof normalizeOwnerRole>;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignmentMemo: string | null;
  isRead: boolean;
};

export function buildV2CustomerDetailRow(
  lead: LeadDetail,
  users?: AdminUserListItem[],
): V2CustomerDetailRow {
  const assignedUserId = lead.assigned_user_id ?? null;
  const assignedUserName =
    assignedUserId && users
      ? (users.find((u) => u.id === assignedUserId)?.name ?? null)
      : null;

  return {
    ...buildCustomerDetailRow(lead),
    currentOwnerRole: normalizeOwnerRole(lead.current_owner_role),
    assignedUserId,
    assignedUserName,
    assignmentMemo: lead.assignment_memo ?? null,
    isRead: lead.is_read !== false,
  };
}
