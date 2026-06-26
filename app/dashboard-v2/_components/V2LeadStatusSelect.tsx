"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getV2LeadStatusSelectClass,
  isValidV2LeadStatus,
  normalizeV2LeadStatus,
  V2_LEAD_STATUS_OPTIONS,
} from "@/lib/v2-lead-status";
import { updateV2LeadStatusWithReason } from "../_actions/status";
import V2StatusChangeReasonModal from "./V2StatusChangeReasonModal";

export interface V2LeadStatusSelectProps {
  leadId: string;
  value: string;
  onChanged?: (newStatus: string, notes?: string) => void;
  stopPropagation?: boolean;
  className?: string;
  disabled?: boolean;
}

export function V2LeadStatusSelect({
  leadId,
  value,
  onChanged,
  stopPropagation = true,
  className = "",
  disabled = false,
}: V2LeadStatusSelectProps) {
  const normalizedValue = normalizeV2LeadStatus(value);
  const [status, setStatus] = useState(normalizedValue);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const orphanStatus =
    !isValidV2LeadStatus(normalizedValue) &&
    normalizedValue &&
    !(V2_LEAD_STATUS_OPTIONS as readonly string[]).includes(normalizedValue)
      ? normalizedValue
      : null;

  useEffect(() => {
    setStatus(normalizeV2LeadStatus(value));
    setError("");
  }, [leadId, value]);

  const handleChange = (next: string) => {
    if (disabled || isPending) return;
    if (next === status) return;

    if (selectRef.current) {
      selectRef.current.value = status;
    }

    setPendingStatus(next);
    setModalOpen(true);
  };

  const handleConfirm = async (reason: string) => {
    if (!pendingStatus) return { success: false, error: "상태가 선택되지 않았습니다." };

    setIsPending(true);
    const prev = status;
    const result = await updateV2LeadStatusWithReason(leadId, pendingStatus, reason);
    setIsPending(false);

    if (result.success) {
      setStatus(pendingStatus);
      setPendingStatus(null);
      onChanged?.(pendingStatus, result.notes);
      return { success: true };
    }

    if (selectRef.current) {
      selectRef.current.value = prev;
    }
    const msg = result.error ?? "저장 실패";
    setError(
      msg.includes("enum lead_status")
        ? "DB에 해당 상태값이 없습니다. Supabase에서 27_v2_six_stage_lead_status.sql 을 실행해 주세요."
        : msg,
    );
    return { success: false, error: msg };
  };

  const handleModalClose = () => {
    if (isPending) return;
    setModalOpen(false);
    setPendingStatus(null);
    if (selectRef.current) {
      selectRef.current.value = status;
    }
  };

  return (
    <>
      <div
        className={`flex flex-col gap-1 ${className}`}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        <div
          className={`relative flex items-center ${className.includes("w-full") ? "w-full" : "inline-flex max-w-full"}`}
        >
          <select
            ref={selectRef}
            value={isValidV2LeadStatus(status) ? status : (orphanStatus ?? status)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled || isPending}
            aria-label="상담 상태 변경"
            className={`font-bold border rounded-full truncate
              focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              disabled:opacity-60 disabled:cursor-wait
              ${className.includes("w-full")
                ? "w-full text-sm pl-3 pr-8 py-2.5 rounded-xl"
                : "text-[11px] sm:text-xs pl-2.5 pr-7 py-1.5 max-w-[200px] sm:max-w-[220px]"}
              ${getV2LeadStatusSelectClass(status)}`}
          >
            {orphanStatus && (
              <option value={orphanStatus}>{orphanStatus}</option>
            )}
            <optgroup label="업무 단계">
              {V2_LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
          </select>
          {isPending && (
            <Loader2 className="w-3 h-3 animate-spin text-slate-400 absolute right-2 pointer-events-none" />
          )}
        </div>
        {error && <span className="text-[10px] text-red-500">{error}</span>}
      </div>

      {pendingStatus && (
        <V2StatusChangeReasonModal
          open={modalOpen}
          fromStatus={status}
          toStatus={pendingStatus}
          onClose={handleModalClose}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
