"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { LeadDetailPanel, type LeadDetail } from "./LeadDetailPanel";

const STATUS_STYLE: Record<string, string> = {
  신규:     "bg-blue-50 text-blue-700",
  연락대기: "bg-yellow-50 text-yellow-700",
  상담중:   "bg-purple-50 text-purple-700",
  계약완료: "bg-emerald-50 text-emerald-700",
  보류:     "bg-slate-100 text-slate-500",
  종결:     "bg-red-50 text-red-500",
};

const STATUS_BAR_COLOR: Record<string, string> = {
  신규:     "bg-blue-500",
  연락대기: "bg-yellow-400",
  상담중:   "bg-purple-500",
  계약완료: "bg-emerald-500",
  보류:     "bg-slate-300",
  종결:     "bg-red-400",
};

const ALL_STATUSES = ["신규", "연락대기", "상담중", "계약완료", "보류", "종결"];

interface Props {
  leads: LeadDetail[];
  totalLeads: number;
  statusCount: Record<string, number>;
}

export function AgentLeadsSection({ leads, totalLeads, statusCount }: Props) {
  const [selected, setSelected] = useState<LeadDetail | null>(null);

  return (
    <>
      {/* 내 접수 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
          <span className="w-4 h-4 text-[#0f2d5e]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M9 12h6m-3-3v6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="font-bold text-slate-800 text-sm">내 접수 목록</h2>
          <span className="ml-auto text-xs text-slate-400">{totalLeads}건</span>
        </div>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <p className="text-sm">아직 접수된 내역이 없습니다.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {leads.map((lead) => (
              <li
                key={lead.id}
                onClick={() => setSelected(lead)}
                className="px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-sm">{lead.customer_name}</span>
                    <span className="text-xs text-slate-400">{lead.disease_name}</span>
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[lead.consultation_status] ?? "bg-slate-100 text-slate-500"}`}>
                      {lead.consultation_status}
                    </span>
                    <span className="text-xs text-slate-300">{lead.created_at.slice(0, 10)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 상태 분포 */}
      {totalLeads > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4">
          <h2 className="font-bold text-slate-800 text-sm mb-4">상태 분포</h2>
          <div className="flex flex-col gap-2">
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16 shrink-0">{s}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${STATUS_BAR_COLOR[s]} rounded-full transition-all`}
                    style={{ width: totalLeads > 0 ? `${((statusCount[s] ?? 0) / totalLeads) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 w-4 text-right">{statusCount[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <LeadDetailPanel
        lead={selected}
        role="하위영업자"
        onClose={() => setSelected(null)}
        onStatusChanged={(id, newStatus) => {
          setSelected((prev) => prev?.id === id ? { ...prev, consultation_status: newStatus } : prev);
        }}
      />
    </>
  );
}
