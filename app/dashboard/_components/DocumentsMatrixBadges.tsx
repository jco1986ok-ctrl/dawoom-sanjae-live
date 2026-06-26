"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { LeadDocFilesMap, LeadDocKey } from "@/lib/lead-doc-files";
import { getPrimaryDocFile } from "@/lib/lead-doc-files";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import { DocumentViewerModal, type DocumentViewerTarget } from "./DocumentViewerModal";
import { OtherDocsBadges } from "./OtherDocsBadges";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const BADGE_BASE =
  "inline-flex items-center gap-1 text-xs leading-tight px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0";

/** 미수집 — 점선·회색, 비어 있음을 명확히 */
const MISSING_SOFT =
  "bg-gray-50 text-gray-400 border border-dashed border-gray-300 font-normal";

/** 미수집·필수(진단서) — 긴급, 펄스 */
const MISSING_URGENT =
  "bg-red-50 text-red-600 border border-red-300 font-bold animate-pulse";

const COLLECTED_HOVER =
  "cursor-pointer hover:scale-105 transition-transform active:scale-[0.98]";

/** 수집 완료 — 위임장과 동일 파란색 */
const OTHER_DOCS_COLLECTED =
  "bg-blue-600 text-white font-bold shadow-sm border border-blue-700";

const OTHER_DOCS_ITEM = {
  label: "📂기타서류",
  missingLabel: "📂기타서류",
  collectedLabel: "📂기타서류",
  title: "기타 서류",
} as const;

type DocItem = {
  key: LeadDocKey;
  label: string;
  missingLabel: string;
  collectedLabel: string;
  title: string;
  collectedClass: string;
  missingClass: string;
  required?: boolean;
};

const DOC_ITEMS: DocItem[] = [
  {
    key: "mandateContract",
    label: "✍️ 위임",
    missingLabel: "✍️ 위임",
    collectedLabel: "✍️ 위임",
    title: "위임장/약정서",
    collectedClass: "bg-blue-600 text-white font-bold shadow-sm border border-blue-700",
    missingClass: MISSING_SOFT,
  },
  {
    key: "diagnosisReport",
    label: "📸진단서",
    missingLabel: "📸진단서X",
    collectedLabel: "📸진단서",
    title: "진단서 (필수)",
    collectedClass: "bg-green-600 text-white font-bold shadow-sm border border-green-700",
    missingClass: MISSING_URGENT,
    required: true,
  },
  {
    key: "employmentDocs",
    label: "🏢회사서류",
    missingLabel: "🏢회사서류",
    collectedLabel: "🏢회사서류",
    title: "근로계약서/임금대장",
    collectedClass: "bg-teal-600 text-white font-bold shadow-sm border border-teal-700",
    missingClass: MISSING_SOFT,
  },
  {
    key: "qualificationHistory",
    label: "자격득실",
    missingLabel: "자격득실",
    collectedLabel: "자격득실",
    title: "자격득실 확인서 (공공/API)",
    collectedClass: "bg-purple-600 text-white font-bold shadow-sm border border-purple-700",
    missingClass: MISSING_SOFT,
  },
  {
    key: "careBenefits10y",
    label: "요양10년",
    missingLabel: "요양10년",
    collectedLabel: "요양10년",
    title: "요양급여 지급확인 (10년)",
    collectedClass: "bg-purple-600 text-white font-bold shadow-sm border border-purple-700",
    missingClass: MISSING_SOFT,
  },
  {
    key: "employmentAccidentHistory",
    label: "고용산재",
    missingLabel: "고용산재",
    collectedLabel: "고용산재",
    title: "고용·산재보험 가입 이력",
    collectedClass: "bg-purple-600 text-white font-bold shadow-sm border border-purple-700",
    missingClass: MISSING_SOFT,
  },
  {
    key: "incomeCertificate",
    label: "소득증명",
    missingLabel: "소득증명",
    collectedLabel: "소득증명",
    title: "소득증명원",
    collectedClass: "bg-purple-600 text-white font-bold shadow-sm border border-purple-700",
    missingClass: MISSING_SOFT,
  },
];

function BadgeContent({
  collected,
  item,
}: {
  collected: boolean;
  item: DocItem;
}) {
  const text = collected ? item.collectedLabel : item.missingLabel;

  if (!collected) {
    return <span>{text}</span>;
  }

  return (
    <>
      <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" aria-hidden />
      <span>{text}</span>
    </>
  );
}

interface Props {
  docsStatus: LeadDocsStatus;
  className?: string;
  /** false면 한 줄(테이블 행) 유지 — 가로 스크롤 */
  wrap?: boolean;
  /** 테이블 등 좁은 영역 */
  compact?: boolean;
  /** RBAC 허용 시 미리보기·다운로드 활성화 */
  interactive?: boolean;
  leadId?: string;
  customerName?: string;
  docFiles?: LeadDocFilesMap;
  otherDocs?: OtherDocEntry[];
}

export default function DocumentsMatrixBadges({
  docsStatus,
  className,
  wrap = true,
  compact = false,
  interactive = false,
  leadId,
  customerName = "고객",
  docFiles = {},
  otherDocs = [],
}: Props) {
  const [viewerTarget, setViewerTarget] = useState<DocumentViewerTarget | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [otherDocsPickerOpen, setOtherDocsPickerOpen] = useState(false);

  const canPreview = interactive && Boolean(leadId);
  const hasOtherDocs = otherDocs.length > 0;
  const badgeBase = compact
    ? "inline-flex items-center gap-0.5 text-[10px] leading-tight px-1.5 py-1 rounded-md whitespace-nowrap shrink-0"
    : BADGE_BASE;

  const openViewer = (item: DocItem) => {
    if (!canPreview || !leadId) return;
    const meta = getPrimaryDocFile(docFiles, item.key);
    setViewerTarget({
      leadId,
      docKey: item.key,
      title: item.title,
      label: item.label,
      fileName: meta?.fileName ?? `${customerName}_${item.title}.pdf`,
      mimeType: meta?.mimeType ?? "application/pdf",
    });
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerTarget(null);
  };

  return (
    <>
      <div
        className={`flex w-full min-w-0 max-w-full ${
          wrap
            ? "flex-wrap gap-1.5"
            : "flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        } ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {DOC_ITEMS.map((item) => {
          const collected = docsStatus[item.key];
          const clickable = canPreview && collected;
          const titleSuffix = collected
            ? " — 접수 완료"
            : item.required
              ? " — 미접수 (필수·긴급)"
              : " — 미접수";

          if (clickable) {
            return (
              <button
                key={item.key}
                type="button"
                title={`${item.title}${titleSuffix} · 클릭하여 미리보기`}
                onClick={() => openViewer(item)}
                className={`${badgeBase} ${item.collectedClass} ${COLLECTED_HOVER}`}
              >
                <BadgeContent collected item={item} />
              </button>
            );
          }

          return (
            <span
              key={item.key}
              title={`${item.title}${titleSuffix}`}
              className={`${badgeBase} ${collected ? item.collectedClass : item.missingClass}`}
            >
              <BadgeContent collected={collected} item={item} />
            </span>
          );
        })}

        {hasOtherDocs && canPreview ? (
          <button
            type="button"
            title={`${OTHER_DOCS_ITEM.title} — ${otherDocs.length}건 · 클릭하여 목록·미리보기`}
            onClick={() => setOtherDocsPickerOpen(true)}
            className={`${badgeBase} ${OTHER_DOCS_COLLECTED} ${COLLECTED_HOVER}`}
          >
            <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" aria-hidden />
            <span>{OTHER_DOCS_ITEM.collectedLabel}</span>
          </button>
        ) : (
          <span
            title={
              hasOtherDocs
                ? `${OTHER_DOCS_ITEM.title} — ${otherDocs.length}건`
                : `${OTHER_DOCS_ITEM.title} — 미접수`
            }
            className={`${badgeBase} ${hasOtherDocs ? OTHER_DOCS_COLLECTED : MISSING_SOFT}`}
          >
            {hasOtherDocs ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" aria-hidden />
                <span>{OTHER_DOCS_ITEM.collectedLabel}</span>
              </>
            ) : (
              <span>{OTHER_DOCS_ITEM.missingLabel}</span>
            )}
          </span>
        )}
      </div>

      {canPreview && leadId && (
        <Dialog open={otherDocsPickerOpen} onOpenChange={setOtherDocsPickerOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogTitle className="text-sm font-bold text-slate-900">
              📂 기타 서류 ({otherDocs.length}건)
            </DialogTitle>
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              파일명을 클릭하면 미리보기·다운로드할 수 있습니다.
            </p>
            <OtherDocsBadges leadId={leadId} otherDocs={otherDocs} interactive />
          </DialogContent>
        </Dialog>
      )}

      {canPreview && (
        <DocumentViewerModal
          target={viewerTarget}
          open={viewerOpen}
          onClose={closeViewer}
        />
      )}
    </>
  );
}

export { DOC_ITEMS };
