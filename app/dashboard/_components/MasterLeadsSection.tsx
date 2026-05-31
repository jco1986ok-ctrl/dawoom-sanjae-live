"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { LeadDetailPanel, type LeadDetail } from "./LeadDetailPanel";

const STATUS_STYLE: Record<string, string> = {
  신규:     "bg-blue-50 text-blue-700",
  연락대기: "bg-yellow-50 text-yellow-700",
  상담중:   "bg-purple-50 text-purple-700",
  계약완료: "bg-emerald-50 text-emerald-700",
  보류:     "bg-slate-100 text-slate-500",
  종결:     "bg-red-50 text-red-500",
};

interface Props {
  leads: LeadDetail[];
}

export function MasterLeadsSection({ leads }: Props) {
  const [selected, setSelected] = useState<LeadDetail | null>(null);

  return (
    <>
      <ul className="divide-y divide-slate-50">
        {leads.map((lead) => (
          <li
            key={lead.id}
            onClick={() => setSelected(lead)}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-slate-800 text-sm">{lead.customer_name}</span>
              <span className="text-xs text-slate-400">
                {lead.disease_name}
                {lead.referral_source && ` · ${lead.referral_source} 접수`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[lead.consultation_status] ?? "bg-slate-100 text-slate-500"}`}>
                {lead.consultation_status}
              </span>
              <span className="text-xs text-slate-300">{lead.created_at.slice(0, 10)}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </li>
        ))}
      </ul>

      <LeadDetailPanel
        lead={selected}
        role="총판영업자"
        onClose={() => setSelected(null)}
        onStatusChanged={(id, newStatus) => {
          setSelected((prev) => prev?.id === id ? { ...prev, consultation_status: newStatus } : prev);
        }}
      />
    </>
  );
}
