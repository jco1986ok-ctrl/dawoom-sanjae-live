"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/lib/types";
import LeadStatusBadge from "../../_components/LeadStatusBadge";

const ALL_STATUSES: LeadStatus[] = [
  "신규",
  "연락대기",
  "상담중",
  "계약완료",
  "보류",
  "종결",
];

export default function AdminLeadEditModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(lead.consultation_status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        consultation_status: status,
        notes: notes.trim() || null,
      })
      .eq("id", lead.id);

    if (updateError) {
      setError("저장 중 오류가 발생했습니다: " + updateError.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`"${lead.customer_name}" 건을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const supabase = createClient();
    await supabase.from("leads").delete().eq("id", lead.id);
    startTransition(() => {
      router.refresh();
    });
    onClose();
  };

  return (
    // 오버레이
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">{lead.customer_name}</h2>
            <p className="text-xs text-muted-foreground">{lead.disease_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="px-5 py-5 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* 고객 기본 정보 (읽기 전용) */}
          <div className="bg-muted/40 rounded-xl px-4 py-3 flex flex-col gap-1 text-sm">
            <Row label="연락처" value={lead.phone} />
            <Row label="접수일" value={new Date(lead.created_at).toLocaleDateString("ko-KR")} />
            {lead.referral_source && (
              <Row label="유입 경로" value={lead.referral_source} />
            )}
            {lead.referred_by && (
              <Row
                label="담당 파트너"
                value={`${lead.referred_by.name} (${lead.referred_by.agent_id})`}
              />
            )}
          </div>

          {/* 상태 변경 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">상담 상태</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    status === s
                      ? "border-primary bg-primary/5"
                      : "border-border text-foreground"
                  }`}
                >
                  <LeadStatusBadge status={s} />
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="상담 관련 메모를 입력하세요"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-28"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 border border-red-200 rounded-xl px-4 py-2.5 font-medium"
          >
            삭제
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-sm border border-border rounded-xl py-2.5 font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 text-sm bg-primary text-white rounded-xl py-2.5 font-bold disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
