"use client";

import { useCallback, useRef, useState } from "react";
import { Eye, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  calculateCollectionProgress,
  DOC_CATEGORY_LABELS,
  DOC_CATEGORY_ORDER,
  type DocCategory,
} from "@/lib/document-collection-catalog";
import {
  formatFileSize,
  getCategoryFileItems,
  type CategoryFileItem,
} from "@/lib/document-category-files";
import type { DiseaseCategory } from "@/lib/disease-category";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { LeadDocKey, LeadDocFilesMap } from "@/lib/lead-doc-files";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import {
  deleteLeadDocumentFile,
  deleteOtherDocumentFile,
  uploadCategoryDocsDirect,
} from "@/lib/client-doc-upload";
import { cn } from "@/lib/utils";

const UPLOAD_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.hwp,.hwpx,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Props {
  leadId: string;
  customerName: string;
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  diseaseCategory?: DiseaseCategory | null;
  className?: string;
  onDocsUpdated: (
    docKey: LeadDocKey,
    patch: {
      docsStatus: LeadDocsStatus;
      docFiles: LeadDocFilesMap;
      docs_status?: unknown;
    },
  ) => void;
  onOtherDocsUpdated: (otherDocs: OtherDocEntry[]) => void;
}

type UploadQueueItem = {
  id: string;
  fileName: string;
  percent: number;
  status: "uploading" | "done" | "error";
};

function UploadProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#60a5fa] transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function CategoryFileRow({
  file,
  disabled,
  onDelete,
}: {
  file: CategoryFileItem;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={() => window.open(file.previewUrl, "_blank")}
        className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[#3182f6]"
        title="미리보기/다운로드"
      >
        <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="truncate text-sm font-medium text-slate-800">{file.fileName}</span>
      </button>
      <span className="shrink-0 text-xs tabular-nums text-slate-500">
        {formatFileSize(file.fileSize)}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        title="삭제"
        aria-label={`${file.fileName} 삭제`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function CategoryUploadSection({
  leadId,
  category,
  files,
  uploadQueue,
  disabled,
  onUpload,
  onDelete,
}: {
  leadId: string;
  category: DocCategory;
  files: CategoryFileItem[];
  uploadQueue: UploadQueueItem[];
  disabled: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (file: CategoryFileItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `category-upload-${leadId}-${category}`;
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (selected: File[]) => {
    if (selected.length === 0) return;
    onUpload(selected);
  };

  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-[13px] font-black text-[#0f2d5e]">{DOC_CATEGORY_LABELS[category]}</h4>
        <span className="text-[11px] font-semibold text-slate-500">{files.length}건</span>
      </div>

      {category === "institution" && (
        <p className="mb-2 flex items-center gap-1 text-[10px] text-slate-400">
          <Eye className="h-3 w-3" />
          공단·기관 발급 서류 업로드 영역입니다.
        </p>
      )}

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          handleFiles(Array.from(e.dataTransfer.files ?? []));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={cn(
          "mb-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          dragOver
            ? "border-[#3182f6] bg-[#E8F3FF]"
            : "border-slate-300 bg-white hover:border-[#3182f6]/60 hover:bg-slate-50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="h-8 w-8 text-[#3182f6]/70" />
        <p className="text-sm font-semibold text-slate-700">
          파일을 여기에 끌어다 놓거나 클릭하여 선택
        </p>
        <p className="text-[11px] text-slate-500">
          PDF · JPG · PNG · HWP · DOC · DOCX · 여러 파일 동시 선택 가능 (최대 1GB/건)
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            e.target.value = "";
            handleFiles(selected);
          }}
        />
      </div>

      {uploadQueue.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {uploadQueue.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-slate-700">{item.fileName}</span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-[#3182f6]">
                  {item.status === "done" ? "완료" : `${item.percent}%`}
                </span>
              </div>
              <UploadProgressBar percent={item.status === "done" ? 100 : item.percent} />
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <CategoryFileRow
              key={file.id}
              file={file}
              disabled={disabled}
              onDelete={() => onDelete(file)}
            />
          ))}
        </ul>
      ) : uploadQueue.length === 0 ? (
        <p className="text-[11px] text-slate-400">등록된 서류가 없습니다.</p>
      ) : null}
    </section>
  );
}

/** 관리자/파트너 — 4대 카테고리 서류 취합 패널 */
export function AdminDocumentCollectionPanel({
  leadId,
  customerName: _customerName,
  docsStatus,
  docFiles,
  otherDocs,
  diseaseCategory: _diseaseCategory = null,
  className,
  onDocsUpdated,
  onOtherDocsUpdated,
}: Props) {
  const [uploadQueues, setUploadQueues] = useState<Record<DocCategory, UploadQueueItem[]>>({
    medical: [],
    personal: [],
    institution: [],
    other: [],
  });
  const [busyCategories, setBusyCategories] = useState<Set<DocCategory>>(new Set());

  const progress = calculateCollectionProgress(docsStatus, docFiles, otherDocs);

  const setCategoryBusy = useCallback((category: DocCategory, busy: boolean) => {
    setBusyCategories((prev) => {
      const next = new Set(prev);
      if (busy) next.add(category);
      else next.delete(category);
      return next;
    });
  }, []);

  const updateQueueItem = useCallback(
    (category: DocCategory, id: string, patch: Partial<UploadQueueItem>) => {
      setUploadQueues((prev) => ({
        ...prev,
        [category]: prev[category].map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      }));
    },
    [],
  );

  const clearQueueAfterDelay = useCallback((category: DocCategory, delayMs = 1500) => {
    window.setTimeout(() => {
      setUploadQueues((prev) => ({ ...prev, [category]: [] }));
    }, delayMs);
  }, []);

  const handleCategoryUpload = useCallback(
    async (category: DocCategory, files: File[]) => {
      const queueItems: UploadQueueItem[] = files.map((file, index) => ({
        id: `${category}-${Date.now()}-${index}`,
        fileName: file.name,
        percent: 0,
        status: "uploading" as const,
      }));

      setUploadQueues((prev) => ({ ...prev, [category]: queueItems }));
      setCategoryBusy(category, true);

      try {
        const result = await uploadCategoryDocsDirect(
          leadId,
          files,
          category,
          (fileIndex, _fileName, percent) => {
            const item = queueItems[fileIndex];
            if (item) {
              updateQueueItem(category, item.id, { percent, status: "uploading" });
            }
          },
        );

        queueItems.forEach((item) => {
          updateQueueItem(category, item.id, { percent: 100, status: "done" });
        });

        onOtherDocsUpdated(result.otherDocs);
        toast.success(
          files.length > 1
            ? `${DOC_CATEGORY_LABELS[category]} ${files.length}건 업로드 완료`
            : `${DOC_CATEGORY_LABELS[category]} 업로드 완료`,
        );
        clearQueueAfterDelay(category);
      } catch (err) {
        queueItems.forEach((item) => {
          updateQueueItem(category, item.id, { status: "error" });
        });
        toast.error(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
        clearQueueAfterDelay(category, 3000);
      } finally {
        setCategoryBusy(category, false);
      }
    },
    [leadId, onOtherDocsUpdated, updateQueueItem, clearQueueAfterDelay, setCategoryBusy],
  );

  const handleDelete = useCallback(
    async (category: DocCategory, file: CategoryFileItem) => {
      if (!window.confirm(`"${file.fileName}" 파일을 삭제할까요?`)) return;
      setCategoryBusy(category, true);
      try {
        if (file.kind === "standard" && file.docKey) {
          const result = await deleteLeadDocumentFile(leadId, file.docKey, file.storagePath);
          onDocsUpdated(file.docKey, {
            docsStatus: result.docsStatus,
            docFiles: result.docFiles ?? {},
            docs_status: result.docs_status,
          });
        } else {
          const result = await deleteOtherDocumentFile(leadId, file.storagePath);
          onOtherDocsUpdated(result.otherDocs);
        }
        toast.success("파일이 삭제되었습니다.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
      } finally {
        setCategoryBusy(category, false);
      }
    },
    [leadId, onDocsUpdated, onOtherDocsUpdated, setCategoryBusy],
  );

  const isAnyBusy = busyCategories.size > 0;

  return (
    <div className={cn("relative rounded-xl border border-gray-200 bg-gray-50 p-5", className)}>
      <div className="mb-5">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">서류 취합 현황</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {progress.collected}건 수집 · 카톡·현장 수령 서류 직접 첨부
            </p>
          </div>
          <span className="text-2xl font-black tabular-nums text-[#3182f6]">{progress.percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-gradient-to-r from-[#3182f6] to-[#60a5fa] transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {DOC_CATEGORY_ORDER.map((category) => {
        const files = getCategoryFileItems(
          category,
          leadId,
          docsStatus,
          docFiles,
          otherDocs,
        );
        return (
          <CategoryUploadSection
            key={category}
            leadId={leadId}
            category={category}
            files={files}
            uploadQueue={uploadQueues[category]}
            disabled={isAnyBusy}
            onUpload={(selected) => void handleCategoryUpload(category, selected)}
            onDelete={(file) => void handleDelete(category, file)}
          />
        );
      })}

      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
        <Eye className="h-3 w-3" />
        위임장/약정서는 전자서명 PDF로 별도 관리됩니다. zip·exe·동영상 파일은 업로드할 수 없습니다.
      </p>
    </div>
  );
}

/** @deprecated — 하위 호환 export */
export { AdminDocumentCollectionPanel as default };
