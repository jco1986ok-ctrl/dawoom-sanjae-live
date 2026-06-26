"use client";

import type { LeadDetail } from "@/lib/lead-detail";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { shouldUseV2MyTasksView } from "@/lib/v2-my-tasks";
import V2CustomerManageTable from "./V2CustomerManageTable";
import V2InsideStaffBoard from "./V2InsideStaffBoard";

interface Props {
  leads: LeadDetail[];
  users: AdminUserListItem[];
  viewerUserId: string;
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
  users,
  viewerUserId,
  assignedTo,
  clientRefetch,
  viewerRole,
  currentUserRole,
  canChangeStatus,
  canWriteMemo,
  canDelete,
}: Props) {
  const isInsideStaffView = currentUserRole === "일반팀원";
  const myTasksOnly = shouldUseV2MyTasksView(currentUserRole);

  if (isInsideStaffView) {
    return (
      <V2InsideStaffBoard
        leads={leads}
        users={users}
        viewerUserId={viewerUserId}
        myTasksOnly={myTasksOnly}
        canChangeStatus={canChangeStatus}
        canWriteMemo={canWriteMemo}
        viewerRole={viewerRole}
      />
    );
  }

  return (
    <V2CustomerManageTable
      leads={leads}
      users={users}
      viewerUserId={viewerUserId}
      myTasksOnly={myTasksOnly}
      assignedTo={assignedTo}
      clientRefetch={clientRefetch}
      viewerRole={viewerRole}
      canChangeStatus={canChangeStatus}
      canWriteMemo={canWriteMemo}
      canDelete={canDelete}
    />
  );
}
