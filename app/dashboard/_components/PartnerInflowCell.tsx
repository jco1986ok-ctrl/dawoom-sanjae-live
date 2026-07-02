"use client";

import type { InflowInfo } from "@/lib/lead-attribution";
import { cn } from "@/lib/utils";

interface Props {
  partnerName?: string | null;
  lineageLabel?: string | null;
  inflow?: InflowInfo | null;
  attributionTrace?: string | null;
  onClick?: () => void;
  className?: string;
}

/** 테이블 행 — 유입 파트너·라인 표시 (미확인 시 상세 유도) */
export function PartnerInflowCell({
  partnerName,
  lineageLabel,
  inflow,
  attributionTrace,
  onClick,
  className,
}: Props) {
  const name = partnerName?.trim();
  const line =
    lineageLabel?.trim() && lineageLabel !== "유입 계정 미확인"
      ? lineageLabel
      : null;
  const trace = attributionTrace?.trim();
  const isNatural = inflow?.type === "natural" && !name && !line;

  if (isNatural) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          "text-left text-[10px] text-slate-400 hover:text-slate-600",
          className,
        )}
        title="유입 상세 보기"
      >
        자연유입
      </button>
    );
  }

  if (!name && !line && !trace) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        title="유입 파트너 및 계정 라인 전체 보기"
        className={cn(
          "inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md",
          "bg-amber-50 text-amber-800 border border-amber-200",
          "hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0",
          className,
        )}
      >
        유입 미확인
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={trace ?? line ?? name ?? "유입 상세"}
      className={cn(
        "text-left min-w-0 max-w-[200px] rounded-md px-2 py-1",
        "hover:bg-slate-100 transition-colors",
        className,
      )}
    >
      {name && (
        <div className="text-xs font-semibold text-slate-800 truncate">{name}</div>
      )}
      {line && (
        <div className="text-[10px] text-slate-500 truncate leading-snug mt-0.5">{line}</div>
      )}
      {inflow?.linkParam && (
        <div className="text-[10px] font-mono text-indigo-600 truncate mt-0.5">
          {inflow.linkParam}
        </div>
      )}
      {!name && trace && (
        <div className="text-[10px] text-violet-700 truncate leading-snug">{trace}</div>
      )}
    </button>
  );
}

/** @deprecated — 하위 호환 */
export function PartnerConfirmBadge({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <PartnerInflowCell
      onClick={onClick}
      className={className}
    />
  );
}
