"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { LeadDetailPanel, type LeadDetail, type AttorneyOption } from "./LeadDetailPanel";
import { deleteLead } from "../_actions/leads";

// ── 파트너 셀 렌더 로직 ──────────────────────────────────────
function PartnerCell({
  lead,
  viewerRole,
  showLineage,
}: {
  lead: LeadDetail;
  viewerRole: string;
  showLineage: boolean;
}) {
  const { partner_name, parent_partner_name, is_viewer_direct } = lead;

  // ─ 총괄 파트너 뷰 ─────────────────────────────────────────
  if (viewerRole === "총괄공식파트너") {
    if (is_viewer_direct) {
      return (
        <span className="font-semibold text-slate-700">
          {partner_name ?? "—"}
          <span className="ml-1 text-slate-400 font-normal">(직접)</span>
        </span>
      );
    }
    if (partner_name) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center w-fit bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            내 파트너
          </span>
          <span className="font-semibold text-slate-700">{partner_name}</span>
        </div>
      );
    }
    return <span className="text-slate-300">직접접수</span>;
  }

  // ─ 관리자 뷰 (기본) ──────────────────────────────────────
  if (partner_name) {
    return (
      <div className="flex flex-col gap-0.5">
        {showLineage && (
          parent_partner_name ? (
            // 총괄 파트너 산하 — 보라 뱃지
            <span className="inline-flex items-center w-fit bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {parent_partner_name} 총괄 라인
            </span>
          ) : (
            // 관리자 직속 — 골드 뱃지
            <span className="inline-flex items-center w-fit bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              👑 본사 직속
            </span>
          )
        )}
        <span className="font-semibold text-slate-700">{partner_name}</span>
      </div>
    );
  }

  return <span className="text-slate-300">직접접수</span>;
}

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
  showLineage?: boolean;
  canDelete?: boolean;
  /** "관리자" | "총괄공식파트너" — 파트너 셀 렌더링 모드 결정 */
  viewerRole?: string;
  /** 배당 가능한 일반노무사 목록 (관리자·대표노무사 전용) */
  attorneys?: AttorneyOption[];
}

export function AdminLeadsSection({ leads, showLineage = false, canDelete = false, viewerRole = "관리자", attorneys = [] }: Props) {
  const [selected, setSelected]    = useState<LeadDetail | null>(null);
  const [localLeads, setLocalLeads] = useState<LeadDetail[]>(leads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition]         = useTransition();

  async function handleDelete(e: React.MouseEvent, leadId: string) {
    e.stopPropagation(); // 행 클릭(상세 패널) 방지
    if (!window.confirm("이 접수 데이터를 정말 삭제하시겠습니까? (복구 불가)")) return;

    setDeletingId(leadId);
    startTransition(async () => {
      const result = await deleteLead(leadId);
      if (result.success) {
        setLocalLeads((prev) => prev.filter((l) => l.id !== leadId));
        if (selected?.id === leadId) setSelected(null);
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
      setDeletingId(null);
    });
  }

  function handleStatusChanged(id: string, newStatus: string) {
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, consultation_status: newStatus } : l)),
    );
    setSelected((prev) =>
      prev?.id === id ? { ...prev, consultation_status: newStatus } : prev,
    );
  }

  function handleAssigned(id: string, assignedToId: string | null, name: string | null) {
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, assigned_to: assignedToId, assigned_attorney_name: name }
          : l,
      ),
    );
    setSelected((prev) =>
      prev?.id === id
        ? { ...prev, assigned_to: assignedToId, assigned_attorney_name: name }
        : prev,
    );
  }

  return (
    <>
      {localLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <p className="text-sm">아직 접수된 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">고객</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">질환</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">파트너</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">상태</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">날짜</th>
                {canDelete && <th className="py-2.5 px-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {localLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-semibold text-slate-800">{lead.customer_name}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs hidden sm:table-cell">{lead.disease_name}</td>
                  <td className="py-3 px-4 text-xs hidden sm:table-cell">
                    <PartnerCell lead={lead} viewerRole={viewerRole} showLineage={showLineage} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${STATUS_STYLE[lead.consultation_status] ?? "bg-slate-100 text-slate-500"}`}>
                        {lead.consultation_status}
                      </span>
                      {lead.assigned_attorney_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full w-fit">
                          ⚖️ {lead.assigned_attorney_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-400">{lead.created_at.slice(0, 10)}</td>
                  {canDelete && (
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={(e) => handleDelete(e, lead.id)}
                        disabled={deletingId === lead.id}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="접수 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadDetailPanel
        lead={selected}
        role={viewerRole === "관리자" ? "관리자" : "파트너"}
        onClose={() => setSelected(null)}
        onStatusChanged={handleStatusChanged}
        attorneys={attorneys}
        onAssigned={handleAssigned}
      />
    </>
  );
}
