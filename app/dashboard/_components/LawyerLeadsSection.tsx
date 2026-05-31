"use client";

import { useState } from "react";
import { ChevronRight, MessageSquare } from "lucide-react";
import { LeadDetailPanel, type LeadDetail, type AttorneyOption } from "./LeadDetailPanel";

interface Props {
  pending:    LeadDetail[];
  inProgress: LeadDetail[];
  done:       LeadDetail[];
  /** 배당 가능한 일반노무사 목록 */
  attorneys?: AttorneyOption[];
  /** LeadDetailPanel 에 전달할 role (기본: "노무사") */
  panelRole?: string;
}

export function LawyerLeadsSection({ pending, inProgress, done, attorneys = [], panelRole = "노무사" }: Props) {
  const [selected, setSelected] = useState<LeadDetail | null>(null);

  const [localPending,    setLocalPending]    = useState<LeadDetail[]>(pending);
  const [localInProgress, setLocalInProgress] = useState<LeadDetail[]>(inProgress);
  const [localDone,       setLocalDone]       = useState<LeadDetail[]>(done);

  function handleAssigned(id: string, assignedToId: string | null, name: string | null) {
    const update = (arr: LeadDetail[]) =>
      arr.map((l) => l.id === id ? { ...l, assigned_to: assignedToId, assigned_attorney_name: name } : l);
    setLocalPending(update);
    setLocalInProgress(update);
    setLocalDone(update);
    setSelected((prev) =>
      prev?.id === id ? { ...prev, assigned_to: assignedToId, assigned_attorney_name: name } : prev,
    );
  }

  function handleStatusChanged(id: string, newStatus: string) {
    const allLeads = [...localPending, ...localInProgress, ...localDone];
    const updated  = allLeads.map((l) => (l.id === id ? { ...l, consultation_status: newStatus } : l));

    setLocalPending(updated.filter((l) => ["신규", "연락대기"].includes(l.consultation_status)));
    setLocalInProgress(updated.filter((l) => l.consultation_status === "상담중"));
    setLocalDone(updated.filter((l) => ["계약완료", "종결", "보류"].includes(l.consultation_status)));

    setSelected((prev) => prev?.id === id ? { ...prev, consultation_status: newStatus } : prev);
  }

  return (
    <>
      {/* 검토 대기 */}
      <Section title="검토 대기" accent="text-orange-500" badge={localPending.length}>
        {localPending.length === 0 ? (
          <EmptyState message="검토 대기 중인 건이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {localPending.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelected(c)}
                className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{c.customer_name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      c.consultation_status === "신규"
                        ? "bg-red-50 text-red-600"
                        : "bg-yellow-50 text-yellow-600"
                    }`}>
                      {c.consultation_status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{c.disease_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{c.created_at.slice(0, 10)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-200" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 상담 진행중 */}
      <Section title="상담 진행중" accent="text-purple-500" badge={localInProgress.length}>
        {localInProgress.length === 0 ? (
          <EmptyState message="진행 중인 상담이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {localInProgress.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelected(c)}
                className="px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-slate-800 text-sm">{c.customer_name}</span>
                    <span className="text-xs text-slate-400">{c.disease_name}</span>
                    {c.notes && (
                      <div className="flex items-start gap-1.5 mt-1 bg-purple-50 rounded-xl px-3 py-2">
                        <MessageSquare className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-purple-700 leading-relaxed line-clamp-2">{c.notes}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 mt-0.5">{c.created_at.slice(0, 10)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 처리 완료 */}
      <Section title="최근 처리 완료" accent="text-emerald-500" badge={localDone.length}>
        {localDone.length === 0 ? (
          <EmptyState message="아직 처리 완료된 건이 없습니다." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {localDone.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelected(c)}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-800 text-sm">{c.customer_name}</span>
                  <span className="text-xs text-slate-400">{c.disease_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    c.consultation_status === "계약완료"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.consultation_status}
                  </span>
                  <span className="text-xs text-slate-400">{c.created_at.slice(0, 10)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <LeadDetailPanel
        lead={selected}
        role={panelRole}
        onClose={() => setSelected(null)}
        onStatusChanged={handleStatusChanged}
        attorneys={attorneys}
        onAssigned={handleAssigned}
      />
    </>
  );
}

function Section({ title, accent, badge, children }: {
  title: string; accent: string; badge: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
        <h2 className={`font-bold text-sm ${accent}`}>{title}</h2>
        {badge > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-slate-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}
