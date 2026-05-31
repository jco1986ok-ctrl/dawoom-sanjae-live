"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LeadStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  신규: "연락대기",
  연락대기: "상담중",
  상담중: "계약완료",
};

const NEXT_LABEL: Partial<Record<LeadStatus, string>> = {
  신규: "연락 시작",
  연락대기: "상담 시작",
  상담중: "계약 완료 처리",
};

export default function AttorneyLeadActions({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const nextStatus = NEXT_STATUS[currentStatus];
  const nextLabel = NEXT_LABEL[currentStatus];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    const supabase = createClient();
    await supabase
      .from("leads")
      .update({
        consultation_status: nextStatus,
        ...(notes.trim() ? { notes } : {}),
      })
      .eq("id", leadId);

    startTransition(() => {
      router.refresh();
    });
  };

  const handleHold = async () => {
    const supabase = createClient();
    await supabase
      .from("leads")
      .update({ consultation_status: "보류" })
      .eq("id", leadId);

    startTransition(() => {
      router.refresh();
    });
  };

  if (!nextStatus) return null;

  return (
    <div className="flex flex-col gap-2">
      {showNoteInput && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="메모를 입력하세요 (선택)"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setShowNoteInput((v) => !v)}
          className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5"
        >
          {showNoteInput ? "메모 닫기" : "메모 추가"}
        </button>
        <button
          onClick={handleHold}
          disabled={isPending}
          className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          보류
        </button>
        <button
          onClick={handleAdvance}
          disabled={isPending}
          className="flex-1 text-xs bg-primary text-white font-semibold rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          {isPending ? "처리 중..." : nextLabel}
        </button>
      </div>
    </div>
  );
}
