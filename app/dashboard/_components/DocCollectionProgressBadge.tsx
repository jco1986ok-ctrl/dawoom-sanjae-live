"use client";

import type { ReactNode } from "react";
import { calculateCollectionProgress } from "@/lib/document-collection-catalog";
import type { LeadDocFilesMap, LeadDocKey } from "@/lib/lead-doc-files";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import { cn } from "@/lib/utils";

/** 목록·매트릭스 옆 서류 취합률 표시 */
export function DocCollectionProgressBadge({
  docsStatus,
  docFiles,
  otherDocs,
  className,
  compact = false,
  /** 테이블 진행률 컬럼 — 세로 정렬 */
  layout = "row",
  align = "start",
}: {
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  className?: string;
  compact?: boolean;
  layout?: "row" | "column";
  align?: "start" | "center";
}) {
  const { percent, collected, total } = calculateCollectionProgress(
    docsStatus,
    docFiles,
    otherDocs,
  );

  const tone =
    percent >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    percent >= 40 ? "text-[#3182f6] bg-blue-50 border-blue-200" :
    "text-amber-700 bg-amber-50 border-amber-200";

  const showBar = layout === "column" || !compact;

  return (
    <div
      className={cn(
        "min-w-0",
        layout === "column"
          ? cn(
              "flex flex-col gap-1 shrink-0",
              align === "center" ? "items-center" : "items-end",
            )
          : "flex items-center gap-2",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 shrink-0 rounded-full border font-black tabular-nums",
          compact ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
          tone,
        )}
        title={`서류 ${collected}/${total}건 수집 (위임장 포함)`}
      >
        {percent}%
      </span>
      {showBar && (
        <div
          className={cn(
            layout === "column" ? "w-14" : "hidden sm:block flex-1 min-w-[48px] max-w-[80px]",
          )}
        >
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#3182f6] transition-all rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 취합 서류 배지 + 진행률 — 한 줄 가로 배치 */
export function DocumentsWithProgress({
  docsStatus,
  docFiles,
  otherDocs,
  badges,
  progressLayout = "column",
  progressCompact = false,
}: {
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  badges: ReactNode;
  progressLayout?: "row" | "column";
  progressCompact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      <div className="flex-1 min-w-0">{badges}</div>
      <DocCollectionProgressBadge
        docsStatus={docsStatus}
        docFiles={docFiles}
        otherDocs={otherDocs}
        layout={progressLayout}
        compact={progressCompact}
        className="shrink-0"
      />
    </div>
  );
}
