"use client";

import { buildDocDownloadUrl, buildDocPreviewUrl } from "@/lib/lead-doc-files";

interface Props {
  leadId: string;
  customerName: string;
  hasPdf: boolean;
  className?: string;
}

/** 위임·계약서 3종 합본 — iframe 미리보기 + 다운로드 */
export function ContractPdfPreviewBlock({
  leadId,
  customerName,
  hasPdf,
  className = "",
}: Props) {
  if (!hasPdf) {
    return (
      <p className={`text-xs text-slate-400 ${className}`}>
        저장된 위임·계약서 PDF가 없습니다.
      </p>
    );
  }

  const previewUrl = buildDocPreviewUrl(leadId, "mandateContract");
  const downloadUrl = buildDocDownloadUrl(leadId, "mandateContract");

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        위임장 · 계약서 (3종 합본)
      </p>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
        <iframe
          title={`${customerName} 위임 계약서 미리보기`}
          src={previewUrl}
          className="h-64 w-full bg-white"
        />
      </div>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full rounded-2xl bg-[#3182F6] hover:bg-[#1B6FE8] text-white font-bold text-[15px] tracking-[-0.02em] px-5 py-4 shadow-[0_4px_16px_rgba(49,130,246,0.35)] transition-colors active:scale-[0.99]"
      >
        ⬇️ 위임장 및 계약서 다운로드
      </a>
    </div>
  );
}
