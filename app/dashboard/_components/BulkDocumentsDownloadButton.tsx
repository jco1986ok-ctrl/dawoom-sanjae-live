"use client";

import { Archive } from "lucide-react";
import { toast } from "sonner";
import { buildBulkZipUrl, getCollectedDocKeys } from "@/lib/lead-doc-files";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";

interface Props {
  leadId: string;
  customerName: string;
  docsStatus: LeadDocsStatus;
  className?: string;
}

export function BulkDocumentsDownloadButton({
  leadId,
  customerName,
  docsStatus,
  className = "",
}: Props) {
  const collectedCount = getCollectedDocKeys(docsStatus).length;
  if (collectedCount === 0) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    toast.info("해당 고객의 수집된 모든 서류를 ZIP 파일로 압축 중입니다...", {
      duration: 4000,
    });

    const link = document.createElement("a");
    link.href = buildBulkZipUrl(leadId);
    link.download = `${customerName}_취합서류.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      toast.success("ZIP 다운로드가 시작되었습니다.");
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="전체 서류 일괄 다운로드"
      aria-label="전체 서류 일괄 다운로드"
      className={`inline-flex items-center justify-center p-1.5 rounded-lg
        text-[#3182f6] hover:text-[#1B6FE8] hover:bg-blue-50 border border-transparent
        hover:border-blue-100 transition-colors shrink-0 ${className}`}
    >
      <Archive className="w-4 h-4" />
    </button>
  );
}
