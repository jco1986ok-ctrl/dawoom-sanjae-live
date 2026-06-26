"use client";

import { useMemo, useState } from "react";
import { Building2, Scale, UserRound } from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import {
  COLLABORATION_OWNER_BADGE_CLASS,
  COLLABORATION_OWNER_LABELS,
  normalizeOwnerRole,
  type CollaborationOwnerRole,
} from "@/lib/collaboration-workflow";
import { formatLeadDiseaseDisplay } from "@/lib/form-array-fields";
import LeadStatusBadge from "@/app/dashboard/_components/LeadStatusBadge";
import { CustomerDetailModal } from "@/app/dashboard/_components/CustomerDetailModal";
import V2DetailActionPanel from "./V2DetailActionPanel";
import {
  buildV2CustomerDetailRow,
  type V2CustomerDetailRow,
} from "../_lib/v2-customer-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { markLeadAssignmentRead } from "../_actions/assignment";
import {
  getV2AgingRowClass,
  isLeadAgingStale,
  sortV2AssigneeLeads,
} from "@/lib/v2-task-aging";
import { cn } from "@/lib/utils";

const COLUMNS: {
  role: CollaborationOwnerRole;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    role: "inside_staff",
    title: "내 할 일",
    subtitle: "inside_staff",
    icon: <UserRound className="w-4 h-4" />,
    accent: "border-sky-200 bg-sky-50/50",
  },
  {
    role: "field_manager",
    title: "현장 대기중",
    subtitle: "field_manager",
    icon: <Building2 className="w-4 h-4" />,
    accent: "border-amber-200 bg-amber-50/50",
  },
  {
    role: "attorney",
    title: "노무사 검토중",
    subtitle: "attorney",
    icon: <Scale className="w-4 h-4" />,
    accent: "border-violet-200 bg-violet-50/50",
  },
];

interface Props {
  leads: LeadDetail[];
  users?: AdminUserListItem[];
  viewerUserId?: string;
  myTasksOnly?: boolean;
  canChangeStatus: boolean;
  canWriteMemo: boolean;
  viewerRole: string;
  canSendReminder?: boolean;
}

export default function V2InsideStaffBoard({
  leads,
  users = [],
  viewerUserId = "",
  myTasksOnly = false,
  canChangeStatus,
  canWriteMemo,
  viewerRole,
  canSendReminder = false,
}: Props) {
  const [detailTarget, setDetailTarget] = useState<V2CustomerDetailRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [localRows, setLocalRows] = useState<Record<string, CollaborationOwnerRole>>({});
  const [assignmentPatches, setAssignmentPatches] = useState<
    Record<
      string,
      {
        assignedUserId: string | null;
        assignedUserName: string | null;
        assignmentMemo: string | null;
        isRead: boolean;
      }
    >
  >({});

  const scopedLeads = useMemo(() => {
    let list = leads;
    if (myTasksOnly && viewerUserId) {
      list = list.filter((l) => l.assigned_user_id === viewerUserId);
      list = sortV2AssigneeLeads(list);
    }
    return list;
  }, [leads, myTasksOnly, viewerUserId]);

  const grouped = useMemo(() => {
    const buckets: Record<CollaborationOwnerRole, LeadDetail[]> = {
      inside_staff: [],
      field_manager: [],
      attorney: [],
    };
    for (const lead of scopedLeads) {
      const role = localRows[lead.id] ?? normalizeOwnerRole(lead.current_owner_role);
      buckets[role].push(lead);
    }
    return buckets;
  }, [scopedLeads, localRows]);

  const rowHighlightClass = (lead: LeadDetail) => {
    const patch = assignmentPatches[lead.id];
    const isRead = patch ? patch.isRead : lead.is_read !== false;

    if (myTasksOnly && isLeadAgingStale(lead)) {
      return getV2AgingRowClass(lead);
    }
    if (myTasksOnly && !isRead) {
      return "bg-amber-50 ring-1 ring-inset ring-amber-300";
    }
    return "";
  };

  const openDetail = (lead: LeadDetail) => {
    const row = buildV2CustomerDetailRow(lead, users);
    const patched = assignmentPatches[lead.id];
    const merged = patched
      ? {
          ...row,
          assignedUserId: patched.assignedUserId,
          assignedUserName: patched.assignedUserName,
          assignmentMemo: patched.assignmentMemo,
          isRead: patched.isRead,
        }
      : row;
    setDetailTarget(merged);
    setDetailOpen(true);

    if (
      myTasksOnly &&
      viewerUserId &&
      merged.assignedUserId === viewerUserId &&
      !merged.isRead
    ) {
      void markLeadAssignmentRead(lead.id, viewerUserId).then(() => {
        setAssignmentPatches((prev) => ({
          ...prev,
          [lead.id]: {
            assignedUserId: merged.assignedUserId,
            assignedUserName: merged.assignedUserName,
            assignmentMemo: merged.assignmentMemo,
            isRead: true,
          },
        }));
        setDetailTarget((prev) => (prev?.id === lead.id ? { ...prev, isRead: true } : prev));
      });
    }
  };

  const applyOwnerRole = (leadId: string, role: CollaborationOwnerRole) => {
    setLocalRows((prev) => ({ ...prev, [leadId]: role }));
    setDetailTarget((prev) =>
      prev?.id === leadId ? { ...prev, currentOwnerRole: role } : prev,
    );
  };

  const applyAssignment = (
    leadId: string,
    patch: {
      assignedUserId: string;
      assignedUserName: string;
      assignmentMemo: string | null;
      isRead: boolean;
    },
  ) => {
    setAssignmentPatches((prev) => ({
      ...prev,
      [leadId]: {
        assignedUserId: patch.assignedUserId,
        assignedUserName: patch.assignedUserName,
        assignmentMemo: patch.assignmentMemo,
        isRead: patch.isRead,
      },
    }));
    setDetailTarget((prev) =>
      prev?.id === leadId
        ? {
            ...prev,
            assignedUserId: patch.assignedUserId,
            assignedUserName: patch.assignedUserName,
            assignmentMemo: patch.assignmentMemo,
            isRead: patch.isRead,
          }
        : prev,
    );
  };

  return (
    <>
      {myTasksOnly && (
        <p className="px-4 sm:px-5 pt-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold mr-2">
            내 업무 {scopedLeads.length}건
          </span>
          미열람 배정 건은 노란색으로 표시됩니다.
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 sm:p-5">
        {COLUMNS.map((col) => {
          const items = grouped[col.role];
          return (
            <section
              key={col.role}
              className={`rounded-2xl border ${col.accent} min-h-[280px] flex flex-col overflow-hidden`}
            >
              <header className="px-4 py-3 border-b border-white/60 bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="text-[#0f2d5e]">{col.icon}</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{col.title}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{col.subtitle}</p>
                  </div>
                  <span className="ml-auto text-lg font-black text-[#0f2d5e] tabular-nums">
                    {items.length}
                  </span>
                </div>
              </header>

              <ul className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[520px]">
                {items.length === 0 ? (
                  <li className="text-xs text-slate-400 text-center py-8">해당 구역 접수 없음</li>
                ) : (
                  items.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(lead)}
                        className={cn(
                          "w-full text-left rounded-xl border border-white bg-white/90 px-3 py-3 shadow-sm",
                          "hover:border-[#0f2d5e]/20 hover:shadow transition-all",
                          rowHighlightClass(lead),
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {lead.customer_name}
                          </p>
                          <span
                            className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${COLLABORATION_OWNER_BADGE_CLASS[col.role]}`}
                          >
                            {COLLABORATION_OWNER_LABELS[col.role]}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-1">
                          {formatLeadDiseaseDisplay(lead.notes, lead.disease_name)}
                        </p>
                        <div className="mt-2">
                          <LeadStatusBadge status={lead.consultation_status} />
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <CustomerDetailModal
        row={detailTarget}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        canChangeStatus={canChangeStatus}
        canWriteMemo={canWriteMemo}
        viewerRole={viewerRole}
        onNotesUpdated={() => {}}
        onStatusUpdated={() => {}}
      />

      {detailOpen && detailTarget && (
        <V2DetailActionPanel
          row={detailTarget}
          users={users}
          canSendReminder={canSendReminder}
          onOwnerRoleUpdated={(role) => applyOwnerRole(detailTarget.id, role)}
          onAssigned={(patch) => applyAssignment(detailTarget.id, patch)}
        />
      )}
    </>
  );
}
