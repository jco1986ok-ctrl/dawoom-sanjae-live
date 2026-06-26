"use client";

import type { LeadDetail } from "@/lib/lead-detail";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import V2CustomerManageTable from "./V2CustomerManageTable";
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
    <V2CustomerManageTable
      leads={leads}
      assignedTo={assignedTo}
      clientRefetch={clientRefetch}
      viewerRole={viewerRole}
      canChangeStatus={canChangeStatus}
      canWriteMemo={canWriteMemo}
      canDelete={canDelete}
    />
  );
}
