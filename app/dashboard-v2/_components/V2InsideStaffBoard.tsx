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
import V2HandoffPanel from "./V2HandoffPanel";
import {
  CustomerDetailModal,
  buildCustomerDetailRow,
  type CustomerDetailRow,
} from "@/app/dashboard/_components/CustomerDetailModal";

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
  canChangeStatus: boolean;
  canWriteMemo: boolean;
  viewerRole: string;
}

export default function V2InsideStaffBoard({
  leads,
  canChangeStatus,
  canWriteMemo,
  viewerRole,
}: Props) {
  const [detailTarget, setDetailTarget] = useState<CustomerDetailRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [localRows, setLocalRows] = useState<Record<string, CollaborationOwnerRole>>({});

  const grouped = useMemo(() => {
    const buckets: Record<CollaborationOwnerRole, LeadDetail[]> = {
      inside_staff: [],
      field_manager: [],
      attorney: [],
    };
    for (const lead of leads) {
      const role = localRows[lead.id] ?? normalizeOwnerRole(lead.current_owner_role);
      buckets[role].push(lead);
    }
    return buckets;
  }, [leads, localRows]);

  const openDetail = (lead: LeadDetail) => {
    setDetailTarget(buildCustomerDetailRow(lead));
    setDetailOpen(true);
  };

  const applyOwnerRole = (leadId: string, role: CollaborationOwnerRole) => {
    setLocalRows((prev) => ({ ...prev, [leadId]: role }));
    setDetailTarget((prev) =>
      prev?.id === leadId ? { ...prev, currentOwnerRole: role } : prev,
    );
  };

  return (
    <>
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
                        className="w-full text-left rounded-xl border border-white bg-white/90 px-3 py-3 shadow-sm
                          hover:border-[#0f2d5e]/20 hover:shadow transition-all"
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
        collaborationBar={
          detailTarget ? (
            <V2HandoffPanel
              row={detailTarget}
              onOwnerRoleUpdated={(role) => applyOwnerRole(detailTarget.id, role)}
            />
          ) : undefined
        }
      />
    </>
  );
}
