"use client";

import type { LeadDetail } from "@/lib/lead-detail";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { shouldUseV2MyTasksView, isV2PartnerReferredLeadsView } from "@/lib/v2-my-tasks";
import { canUseV2CustomerDbFilters } from "@/lib/v2-partner-access";
import V2CustomerManageTable from "./V2CustomerManageTable";

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
  canAssign?: boolean;
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
  canAssign = false,
}: Props) {
  const myTasksOnly = shouldUseV2MyTasksView(currentUserRole);
  const partnerReferredView = isV2PartnerReferredLeadsView(currentUserRole);
  const showDbFilters = canUseV2CustomerDbFilters(currentUserRole);

  return (
    <V2CustomerManageTable
      leads={leads}
      users={users}
      viewerUserId={viewerUserId}
      myTasksOnly={myTasksOnly}
      partnerReferredView={partnerReferredView}
      partnerScopeRole={currentUserRole}
      showDbFilters={showDbFilters}
      assignedTo={assignedTo}
      clientRefetch={clientRefetch}
      viewerRole={viewerRole}
      canChangeStatus={canChangeStatus}
      canWriteMemo={canWriteMemo}
      canDelete={canDelete}
      canAssign={canAssign}
    />
  );
}
