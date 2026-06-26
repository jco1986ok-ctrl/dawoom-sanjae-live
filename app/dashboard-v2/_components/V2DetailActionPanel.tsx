"use client";

import V2HandoffPanel from "./V2HandoffPanel";
import V2AssignPanel from "./V2AssignPanel";
import V2ReminderButton from "./V2ReminderButton";
import type { V2CustomerDetailRow } from "../_lib/v2-customer-detail";
import type { CollaborationOwnerRole } from "@/lib/collaboration-workflow";
import type { AdminUserListItem } from "@/lib/user-lineage";

/** V2 전용 — 상세 모달 하단 플로팅 (바통 터치 + 담당자 배정 + 독촉) */
export default function V2DetailActionPanel({
  row,
  users,
  canSendReminder = false,
  onOwnerRoleUpdated,
  onAssigned,
}: {
  row: V2CustomerDetailRow;
  users: AdminUserListItem[];
  canSendReminder?: boolean;
  onOwnerRoleUpdated: (role: CollaborationOwnerRole) => void;
  onAssigned: (patch: {
    assignedUserId: string;
    assignedUserName: string;
    assignmentMemo: string | null;
    isRead: boolean;
  }) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none px-4 pb-4 sm:pb-6 max-h-[55vh] overflow-y-auto">
      <div
        className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl px-5 py-4"
        role="region"
        aria-label="협업 액션 패널"
      >
        {canSendReminder && <V2ReminderButton row={row} />}
        <V2HandoffPanel row={row} onOwnerRoleUpdated={onOwnerRoleUpdated} />
        <V2AssignPanel row={row} users={users} onAssigned={onAssigned} />
      </div>
    </div>
  );
}
