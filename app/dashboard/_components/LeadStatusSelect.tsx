"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  LEAD_STATUS_OPTIONS,
  getLeadStatusSelectClass,
  type LeadStatusOption,
  isValidLeadStatus,
} from "@/lib/lead-status";
import { updateLeadStatus } from "../_actions/leads";

export { LEAD_STATUS_OPTIONS };
export type { LeadStatusOption };

interface Props {
  leadId: string;
  value: string;
  onChanged?: (newStatus: string, notes?: string) => void;
  stopPropagation?: boolean;
  className?: string;
  disabled?: boolean;
}

export function LeadStatusSelect({
  leadId,
  value,
  onChanged,
  stopPropagation = true,
  className = "",
  disabled = false,
}: Props) {
  const [status, setStatus] = useState(value);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(value);
    setError("");
  }, [leadId, value]);

  const options =
    isValidLeadStatus(value) && !LEAD_STATUS_OPTIONS.includes(value as LeadStatusOption)
      ? [value, ...LEAD_STATUS_OPTIONS]
      : [...LEAD_STATUS_OPTIONS];

  function handleChange(next: string) {
    if (disabled) return;
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setError("");
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, next);
      if (result.success) {
        onChanged?.(next, result.notes);
      } else {
        setStatus(prev);
        const msg = result.error ?? "저장 실패";
        setError(
          msg.includes("enum lead_status")
            ? "DB에 해당 상태값이 없습니다. Supabase에서 12_lead_status_expansion.sql 을 실행해 주세요."
            : msg,
        );
      }
    });
  }

  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <div className={`relative flex items-center ${className.includes("w-full") ? "w-full" : "inline-flex max-w-full"}`}>
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || isPending}
          aria-label="상담 상태 변경"
          aria-disabled={disabled}
          className={`font-bold border rounded-full truncate
            focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            disabled:opacity-60 disabled:cursor-wait
            ${className.includes("w-full")
              ? "w-full text-sm pl-3 pr-8 py-2.5 rounded-xl"
              : "text-[11px] sm:text-xs pl-2.5 pr-7 py-1.5 max-w-[160px] sm:max-w-[180px]"}
            ${getLeadStatusSelectClass(status)}`}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="w-3 h-3 animate-spin text-slate-400 absolute right-2 pointer-events-none" />
        )}
      </div>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
