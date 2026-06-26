"use client";

import { FileText } from "lucide-react";

interface Props {
  leadId: string;
  hasPdf: boolean;
  customerName?: string;
  className?: string;
}

export function ContractPdfDownloadButton({
  leadId,
  hasPdf,
  className = "",
}: Props) {
  if (!hasPdf) {
    return (
      <p className="text-xs text-slate-400 text-center py-2">
        저장된 위임·계약서 PDF가 없습니다.
      </p>
    );
  }

  return (
    <a
      href={`/api/leads/${leadId}/contract-pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2.5 w-full rounded-2xl bg-[#3182F6] hover:bg-[#1B6FE8] text-white font-bold text-[15px] tracking-[-0.02em] px-5 py-4 shadow-[0_4px_16px_rgba(49,130,246,0.35)] transition-colors active:scale-[0.99] ${className}`}
    >
      <FileText className="w-5 h-5 shrink-0" />
      📄 위임 계약서 3종 다운로드
    </a>
  );
}
