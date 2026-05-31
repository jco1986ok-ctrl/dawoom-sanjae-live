"use client";

import { useState } from "react";
import { Phone, Pencil } from "lucide-react";
import type { Lead } from "@/lib/types";
import LeadStatusBadge from "../../_components/LeadStatusBadge";
import AdminLeadEditModal from "./AdminLeadEditModal";

export default function AdminLeadList({ leads }: { leads: Lead[] }) {
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  return (
    <>
      {leads.length === 0 ? (
        <div className="px-5 py-12 text-center text-muted-foreground text-sm">
          접수된 건이 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {leads.map((lead) => (
            <li key={lead.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">
                    {lead.customer_name}
                  </span>
                  <LeadStatusBadge status={lead.consultation_status} />
                </div>
                <span className="text-xs text-muted-foreground">{lead.disease_name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </span>
                {lead.referred_by && (
                  <span className="text-xs text-muted-foreground">
                    유입: {lead.referred_by.name} ({lead.referred_by.agent_id})
                  </span>
                )}
                {lead.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 mt-0.5 line-clamp-2">
                    {lead.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("ko-KR")}
                </span>
                <button
                  onClick={() => setEditingLead(lead)}
                  className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:text-foreground"
                >
                  <Pencil className="w-3 h-3" />
                  수정
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingLead && (
        <AdminLeadEditModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
        />
      )}
    </>
  );
}
