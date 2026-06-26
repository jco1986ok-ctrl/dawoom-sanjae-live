"use client";

import type { LeadDetail } from "@/lib/lead-detail";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import AttorneyCustomerManageTable from "@/app/dashboard/_components/AttorneyCustomerManageTable";
import V2HandoffPanel from "./V2HandoffPanel";
import V2InsideStaffBoard from "./V2InsideStaffBoard";

interface Props {
  leads: LeadDetail[];
  assignedTo?: string;
  clientRefetch: boolean;
  viewerRole: string;
  currentUserRole: DashboardTestRole;
  canChangeStatus: boolean;
  canWriteMemo: boolean;
  canDelete: boolean;
}

export default function V2CustomerCollaborationSection({
  leads,
  assignedTo,
  clientRefetch,
  viewerRole,
  currentUserRole,
  canChangeStatus,
  canWriteMemo,
  canDelete,
}: Props) {
  const isInsideStaffView = currentUserRole === "일반팀원";

  if (isInsideStaffView) {
    return (
      <V2InsideStaffBoard
        leads={leads}
        canChangeStatus={canChangeStatus}
        canWriteMemo={canWriteMemo}
        viewerRole={viewerRole}
      />
    );
  }

  return (
    <AttorneyCustomerManageTable
      leads={leads}
      assignedTo={assignedTo}
      clientRefetch={clientRefetch}
      viewerRole={viewerRole}
      canChangeStatus={canChangeStatus}
      canWriteMemo={canWriteMemo}
      canDelete={canDelete}
      renderCollaborationBar={(row, { onOwnerRoleUpdated }) => (
        <V2HandoffPanel row={row} onOwnerRoleUpdated={onOwnerRoleUpdated} />
      )}
    />
  );
}
