"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Phone, Calendar, Tag } from "lucide-react";
import { InflowLinkBadge } from "@/components/LeadAttributionCell";
import { LineagePathBadge } from "@/components/LineagePathBadge";
import type { AgentAccountInfo, InflowInfo } from "@/lib/lead-attribution";
import { describeInflowLink } from "@/lib/lead-attribution";
import { getLeadStatusBadgeClass } from "@/lib/lead-status";
import { LeadStatusSelect, LEAD_STATUS_OPTIONS } from "./LeadStatusSelect";
import { canEditLeadAssigneeByDbRole } from "@/lib/dashboard-rbac";
import { assignLead } from "../_actions/leads";
import { SurveyDetailReport } from "./SurveyDetailReport";
import { ContractPdfPreviewBlock } from "./ContractPdfPreviewBlock";
import { parseSurveyFieldMap } from "@/lib/lead-survey-report";

// ── 타입 ─────────────────────────────────────────────────────
export interface LeadDetail {
  id: string;
  customer_name: string;
  phone: string | null;
  disease_name: string | null;
  disease_category?: string | null;
  fee_amount?: number | null;
  consultation_status: string;
  created_at: string;
  referral_source: string | null;
  referrer?: string | null;
  notes: string | null;
  pdf_url?: string | null;
  has_weim?: boolean | null;
  docs_status?: import("@/lib/lead-docs-status").LeadDocsStatus | null;
  other_docs?: unknown;
  referred_by_user_id?: string | null;
  partner_name?: string | null;
  partner_agent_id?: string | null;
  inflow?: InflowInfo;
  agent?: AgentAccountInfo;
  lineage?: import("@/lib/user-lineage").UserLineageNode[];
  lineage_label?: string;
  parent_partner_name?: string | null;
  /** true = 현재 로그인한 뷰어 본인이 직접 접수한 건 */
  is_viewer_direct?: boolean;
  /** 담당 노무사 배당 */
  assigned_to?: string | null;
  assigned_attorney_name?: string | null;
}

export interface AttorneyOption {
  id: string;
  name: string;
}

type LeadStatus = (typeof LEAD_STATUS_OPTIONS)[number];

// ── Notes 파서 ───────────────────────────────────────────────
interface Field { key: string; value: string }

function parseNotes(notes: string | null): Field[] {
  if (!notes?.trim()) return [];
  return notes
    .split("\n")
    .map((line) => {
      const m = line.match(/^\[(.+?)\]\s*(.+)$/);
      return m ? { key: m[1].trim(), value: m[2].trim() } : null;
    })
    .filter(Boolean) as Field[];
}

function getField(fields: Field[], key: string): string | null {
  return fields.find((f) => f.key === key)?.value ?? null;
}

// ── 뱃지 색상 맵 ─────────────────────────────────────────────
const DIAGNOSIS_COLOR: Record<string, string> = {
  "진단 받음": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "미진단":    "bg-slate-100 text-slate-500 border-slate-300",
};

const INTENT_COLOR: Record<string, string> = {
  "신청 의향 있음": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "고려 중":       "bg-amber-100 text-amber-700 border-amber-300",
  "모르겠음":      "bg-slate-100 text-slate-500 border-slate-300",
  "신청 의향 없음": "bg-red-100 text-red-600 border-red-300",
};

const STATUS_CURRENT_STYLE: Record<string, string> = {
  ...Object.fromEntries(
    LEAD_STATUS_OPTIONS.map((s) => [s, `${getLeadStatusBadgeClass(s)} border border-current/20`]),
  ),
  연락대기: "bg-orange-100 text-orange-700 border-orange-200",
  종결: "bg-slate-100 text-slate-500 border-slate-200",
};

// ── 날짜 포맷 ─────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${
    String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Props ────────────────────────────────────────────────────
interface Props {
  lead: LeadDetail | null;
  role: string;
  onClose: () => void;
  onStatusChanged?: (leadId: string, newStatus: string) => void;
  /** 배당 가능한 일반노무사 목록 (관리자/대표노무사만 전달) */
  attorneys?: AttorneyOption[];
  onAssigned?: (leadId: string, assignedToId: string | null, name: string | null) => void;
}

// ════════════════════════════════════════════════════════════
export function LeadDetailPanel({ lead, role, onClose, onStatusChanged, attorneys = [], onAssigned }: Props) {
  const canEdit   = role === "관리자" || role === "노무사" || role === "대표노무사" || role === "일반노무사";
  const canAssign = canEditLeadAssigneeByDbRole(role) && attorneys.length > 0;
  const isOpen    = lead !== null;

  const [selectedStatus,   setSelectedStatus]   = useState<LeadStatus>("신규");

  // 배당 상태
  const [selectedAttorney, setSelectedAttorney] = useState<string>("");
  const [assignResult,     setAssignResult]     = useState<"idle" | "saved" | "error">("idle");
  const [assignError,      setAssignError]      = useState("");
  const [isAssigning,      startAssignTransition] = useTransition();

  useEffect(() => {
    if (lead) {
      setSelectedStatus(lead.consultation_status as LeadStatus);
      setSelectedAttorney(lead.assigned_to ?? "");
      setAssignResult("idle");
      setAssignError("");
    }
  }, [lead?.id]);

  function handleAssign() {
    if (!lead || !canAssign) return;
    setAssignResult("idle");
    startAssignTransition(async () => {
      const newId   = selectedAttorney || null;
      const newName = newId ? (attorneys.find((a) => a.id === newId)?.name ?? null) : null;
      const result  = await assignLead(lead.id, newId);
      if (result.success) {
        setAssignResult("saved");
        onAssigned?.(lead.id, newId, newName);
      } else {
        setAssignResult("error");
        setAssignError(result.error ?? "배당 실패");
      }
    });
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Notes 파싱
  const fields    = lead ? parseNotes(lead.notes) : [];
  const surveyMap = lead ? parseSurveyFieldMap(lead.notes) : {};
  const hasParsed = fields.length > 0 || Object.keys(surveyMap).length > 0;

  // 핵심 3개 뱃지값
  const diagnosisVal = getField(fields, "진단 여부") ?? surveyMap["진단명"] ?? null;
  const workYearsVal = getField(fields, "근무기간") ?? surveyMap["근무 기간"] ?? null;
  const intentVal    = getField(fields, "산재 신청 의향");

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 슬라이드 패널 */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-[500px] bg-white shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        {/* ━━━ 헤더 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="bg-[#0f2d5e] px-5 pt-5 pb-4 flex-shrink-0">
          {/* 닫기 + 현재상태 */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              STATUS_CURRENT_STYLE[lead?.consultation_status ?? ""] ?? "bg-white/10 text-white border-white/20"
            }`}>
              {lead?.consultation_status}
            </span>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 고객 이름 */}
          <h2 className="text-white text-2xl font-black mb-3">
            {lead?.customer_name ?? "—"}
          </h2>

          {/* ★ 핵심 뱃지 3종 */}
          {hasParsed && (
            <div className="flex flex-wrap gap-2">
              {diagnosisVal && (
                <KeyBadge
                  label="진단여부"
                  value={diagnosisVal}
                  colorClass={DIAGNOSIS_COLOR[diagnosisVal] ?? "bg-slate-100 text-slate-500 border-slate-200"}
                />
              )}
              {workYearsVal && (
                <KeyBadge
                  label="근무기간"
                  value={workYearsVal}
                  colorClass="bg-blue-100 text-blue-700 border-blue-200"
                />
              )}
              {intentVal && (
                <KeyBadge
                  label="산재의향"
                  value={intentVal}
                  colorClass={INTENT_COLOR[intentVal] ?? "bg-slate-100 text-slate-500 border-slate-200"}
                />
              )}
            </div>
          )}
        </div>

        {/* ━━━ 본문 (스크롤) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {lead && (
            <>
              {/* 연락처 + 전화걸기 버튼 */}
              <div className="bg-[#0f2d5e]/5 border border-[#0f2d5e]/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400">연락처</span>
                  <span className="font-bold text-slate-800 text-base tracking-wide">
                    {lead.phone ?? "미입력"}
                  </span>
                </div>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 bg-[#0f2d5e] text-white text-sm font-bold
                               px-4 py-2.5 rounded-xl hover:bg-[#1a3d7a] transition-colors shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                    전화걸기
                  </a>
                )}
              </div>

              {/* 접수 기본정보 */}
              <div className="grid grid-cols-2 gap-2">
                <InfoChip icon={<Calendar className="w-3.5 h-3.5" />} label="접수일시">
                  {formatDateTime(lead.created_at)}
                </InfoChip>
                <InfoChip icon={<Tag className="w-3.5 h-3.5" />} label="무료조회 유입" className="col-span-2">
                  <InflowLinkBadge
                    inflow={
                      lead.inflow ??
                      describeInflowLink(lead.referral_source, lead.referrer)
                    }
                  />
                </InfoChip>
                <InfoChip icon={<span className="text-xs">🤝</span>} label="유입 계정 라인" className="col-span-2">
                  <LineagePathBadge lineage={lead.lineage ?? []} />
                </InfoChip>
                <InfoChip icon={<span className="text-xs">🦴</span>} label="질환" className="col-span-2">
                  {lead.disease_name ?? "—"}
                </InfoChip>
              </div>

              <ContractPdfPreviewBlock
                leadId={lead.id}
                customerName={lead.customer_name}
                hasPdf={Boolean(lead.pdf_url || lead.has_weim)}
              />

              {/* ━ 설문 상세 보고서 ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              <SectionTitle>설문 상세 내용</SectionTitle>
              <SurveyDetailReport
                notes={lead.notes}
                diseaseName={lead.disease_name}
                className="mt-0"
              />
            </>
          )}
        </div>

        {/* ━━━ 푸터: 상담·계약 상태 (노무사·대표노무사·관리자) ━━━━━━━━ */}
        {canEdit && lead && (
          <div className="flex-shrink-0 sticky bottom-0 z-10 border-t border-slate-200 px-4 py-4 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
              상담 · 계약 상태
            </p>
            <LeadStatusSelect
              leadId={lead.id}
              value={selectedStatus}
              stopPropagation={false}
              className="w-full"
              onChanged={(newStatus) => {
                setSelectedStatus(newStatus as LeadStatus);
                onStatusChanged?.(lead.id, newStatus);
              }}
            />
            <p className="text-xs text-slate-500 mt-2">
              상태를 선택하면 즉시 저장됩니다. (신규 → 부재중 → 상담중 → 계약완료 → 서류준비 → 공단심사 등)
            </p>
          </div>
        )}

        {/* 배당 섹션 — 관리자·대표노무사만 */}
        {canAssign && lead && (
          <div className="flex-shrink-0 border-t border-slate-100 px-4 py-4 bg-teal-50/60">
            <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <span>⚖️</span> 담당 노무사 배당
            </p>
            {/* 현재 배당 표시 */}
            {lead.assigned_attorney_name && (
              <p className="text-xs text-teal-700 mb-2">
                현재: <span className="font-bold">{lead.assigned_attorney_name}</span>
              </p>
            )}
            <div className="flex gap-2">
              <select
                value={selectedAttorney}
                onChange={(e) => { setSelectedAttorney(e.target.value); setAssignResult("idle"); }}
                disabled={isAssigning}
                className="flex-1 text-sm font-semibold border-2 border-teal-200 rounded-xl px-3 py-2.5
                           focus:border-teal-500 focus:outline-none transition-colors bg-white
                           disabled:opacity-50 cursor-pointer"
              >
                <option value="">— 배당 없음 —</option>
                {attorneys.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={isAssigning || selectedAttorney === (lead.assigned_to ?? "")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold
                           bg-teal-700 text-white hover:bg-teal-800 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isAssigning ? "저장 중" : assignResult === "saved" ? "✓ 완료" : "배당"}
              </button>
            </div>
            {assignResult === "error" && <p className="text-xs text-red-500 mt-1.5">{assignError}</p>}
            {assignResult === "saved" && (
              <p className="text-xs text-teal-600 mt-1.5">✓ 담당 노무사가 배당되었습니다.</p>
            )}
          </div>
        )}

        {!canEdit && lead && (
          <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3 bg-slate-50">
            <p className="text-xs text-slate-400 text-center">상태 변경은 관리자·노무사·대표 노무사만 가능합니다.</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function KeyBadge({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${colorClass}`}>
      <span className="text-[10px] opacity-70">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InfoChip({ icon, label, children, className = "" }: {
  icon: React.ReactNode; label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] text-slate-400 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-xs font-semibold text-slate-700">{children}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}
