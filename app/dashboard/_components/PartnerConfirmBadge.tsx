"use client";

interface Props {
  onClick?: () => void;
  className?: string;
}

/** 테이블 행 — 유입 파트너 상세는 모달에서 확인 */
export function PartnerConfirmBadge({ onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title="유입 파트너 및 계정 라인 전체 보기"
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md
        bg-slate-100 text-slate-600 border border-slate-200
        hover:bg-slate-200 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0
        ${className ?? ""}`}
    >
      👤 파트너 확인
    </button>
  );
}
