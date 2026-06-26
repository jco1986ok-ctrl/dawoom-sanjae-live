"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Eye, FileText, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  calculateCollectionProgress,
  DOC_CATEGORY_LABELS,
  DOC_CATEGORY_ORDER,
  isSlotCollected,
  slotsForDocCategory,
  type DocSlotDefinition,
} from "@/lib/document-collection-catalog";
import type { DiseaseCategory } from "@/lib/disease-category";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import {
  buildDocPreviewUrl,
  getDocFileList,
  type LeadDocKey,
  type LeadDocFilesMap,
} from "@/lib/lead-doc-files";
import {
  buildOtherDocPreviewUrl,
  getOtherDocsForSlot,
  type OtherDocEntry,
} from "@/lib/lead-other-docs";
import {
  deleteLeadDocumentFile,
  deleteOtherDocumentFile,
  uploadLeadDocumentsDirect,
  uploadOtherDocsDirect,
  uploadSlottedDocsDirect,
} from "@/lib/client-doc-upload";
import { OtherDocsBadges } from "./OtherDocsBadges";
import { cn } from "@/lib/utils";

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

type SlotFileItem = {
  id: string;
  fileName: string;
  storagePath: string;
  previewUrl: string;
  kind: "standard" | "other";
  docKey?: LeadDocKey;
  fileIndex?: number;
};

function UploadLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85 backdrop-blur-[2px]">
      <Loader2 className="w-8 h-8 animate-spin text-[#3182f6]" />
      <p className="text-sm font-semibold text-slate-700">파일을 안전하게 업로드 중입니다...</p>
    </div>
  );
}

function SlotFileBadge({
  file,
  disabled,
  onDelete,
}: {
  file: SlotFileItem;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 max-w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] text-slate-700">
      <button
        type="button"
        onClick={() => window.open(file.previewUrl, "_blank")}
        className="inline-flex items-center gap-1 min-w-0 hover:text-[#3182f6]"
        title="미리보기/다운로드"
      >
        <FileText className="w-3 h-3 shrink-0 text-emerald-600" />
        <span className="truncate max-w-[140px]">📄{file.fileName}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
        title="삭제"
        aria-label={`${file.fileName} 삭제`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function DocSlotRow({
  leadId,
  slot,
  collected,
  docFiles,
  otherDocs,
  disabled,
  onDocsUpdated,
  onOtherDocsUpdated,
  onUploadStart,
  onUploadEnd,
}: {
  leadId: string;
  slot: DocSlotDefinition;
  collected: boolean;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  disabled: boolean;
  onDocsUpdated: Props["onDocsUpdated"];
  onOtherDocsUpdated: Props["onOtherDocsUpdated"];
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `slot-upload-${leadId}-${slot.id}`;

  const standardFiles = slot.leadDocKey ? getDocFileList(docFiles, slot.leadDocKey) : [];
  const slottedOthers = getOtherDocsForSlot(otherDocs, slot.id);

  const fileItems: SlotFileItem[] = [
    ...standardFiles.map((meta, fileIndex) => ({
      id: meta.storagePath,
      fileName: meta.fileName,
      storagePath: meta.storagePath,
      previewUrl: buildDocPreviewUrl(leadId, slot.leadDocKey!, fileIndex),
      kind: "standard" as const,
      docKey: slot.leadDocKey,
      fileIndex,
    })),
    ...slottedOthers.map((entry) => {
      const otherIndex = otherDocs.findIndex((doc) => doc.storagePath === entry.storagePath);
      return {
        id: entry.storagePath,
        fileName: entry.fileName,
        storagePath: entry.storagePath,
        previewUrl: buildOtherDocPreviewUrl(leadId, otherIndex),
        kind: "other" as const,
      };
    }),
  ];

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    onUploadStart();
    try {
      if (slot.leadDocKey) {
        const result = await uploadLeadDocumentsDirect(leadId, slot.leadDocKey, files);
        onDocsUpdated(slot.leadDocKey, {
          docsStatus: result.docsStatus,
          docFiles: result.docFiles ?? {},
          docs_status: result.docs_status,
        });
      } else {
        const result = await uploadSlottedDocsDirect(leadId, files, slot.id, slot.category);
        onOtherDocsUpdated(result.otherDocs);
      }
      toast.success(
        files.length > 1
          ? `${slot.label} ${files.length}건 업로드 완료`
          : `${slot.label} 업로드 완료`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      onUploadEnd();
    }
  };

  const handleDelete = async (file: SlotFileItem) => {
    if (!window.confirm(`"${file.fileName}" 파일을 삭제할까요?`)) return;
    onUploadStart();
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
      onUploadEnd();
    }
  };

  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2.5",
        collected
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-dashed border-gray-300",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{slot.label}</p>
          {!collected && (
            <p className="text-[10px] text-red-500/90 mt-0.5 flex items-center gap-1">
              <X className="w-3 h-3" /> ❌ 미제출
            </p>
          )}
          {collected && (
            <p className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1">
              <Check className="w-3 h-3" /> {fileItems.length}건 첨부됨
            </p>
          )}
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (selected.length > 0) void uploadFiles(selected);
          }}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-1 shrink-0 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50",
            collected
              ? "border border-[#3182f6] text-[#3182f6] bg-white hover:bg-[#E8F3FF]"
              : "bg-[#3182f6] text-white hover:bg-[#2563eb]",
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {collected ? "추가 첨부" : "직접 파일 첨부"}
        </button>
      </div>

      {fileItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fileItems.map((file) => (
            <SlotFileBadge
              key={file.id}
              file={file}
              disabled={disabled}
              onDelete={() => void handleDelete(file)}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function getUngroupedOtherDocs(otherDocs: OtherDocEntry[]): OtherDocEntry[] {
  return otherDocs.filter((doc) => !doc.slotId);
}

function OtherDocsBulkSection({
  leadId,
  otherDocs,
  disabled,
  onOtherDocsUpdated,
  onUploadStart,
  onUploadEnd,
}: {
  leadId: string;
  otherDocs: OtherDocEntry[];
  disabled: boolean;
  onOtherDocsUpdated: Props["onOtherDocsUpdated"];
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `other-docs-upload-${leadId}`;
  const ungrouped = getUngroupedOtherDocs(otherDocs);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    onUploadStart();
    try {
      const result = await uploadOtherDocsDirect(leadId, files);
      onOtherDocsUpdated(result.otherDocs);
      toast.success(
        files.length > 1 ? `기타 서류 ${files.length}건 업로드 완료` : "기타 서류 업로드 완료",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      onUploadEnd();
    }
  };

  return (
    <section className="mt-5 pt-5 border-t border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-[13px] font-black text-[#0f2d5e]">기타 서류</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            항목 분류 없이 추가 서류 — 여러 파일을 한 번에 선택해 업로드할 수 있습니다.
          </p>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (selected.length > 0) void uploadFiles(selected);
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 shrink-0 text-xs font-bold px-3 py-2 rounded-lg
            bg-[#3182f6] text-white hover:bg-[#2563eb] disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          기타 서류 첨부
        </button>
      </div>

      {ungrouped.length > 0 ? (
        <OtherDocsBadges leadId={leadId} otherDocs={ungrouped} interactive />
      ) : (
        <p className="text-[11px] text-slate-400">등록된 기타 서류가 없습니다.</p>
      )}
    </section>
  );
}

/** 관리자/파트너 — 3단계 카테고리 서류 수집 패널 */
export function AdminDocumentCollectionPanel({
  leadId,
  customerName: _customerName,
  docsStatus,
  docFiles,
  otherDocs,
  diseaseCategory = null,
  className,
  onDocsUpdated,
  onOtherDocsUpdated,
}: Props) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const isUploading = uploadingCount > 0;

  const progress = calculateCollectionProgress(docsStatus, docFiles, otherDocs, diseaseCategory);

  const beginUpload = useCallback(() => setUploadingCount((c) => c + 1), []);
  const endUpload = useCallback(() => setUploadingCount((c) => Math.max(0, c - 1)), []);

  return (
    <div className={cn("relative bg-gray-50 border border-gray-200 rounded-xl p-5", className)}>
      <UploadLoadingOverlay visible={isUploading} />

      <div className="mb-5">
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">서류 취합 현황</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {progress.collected} / {progress.total}건 수집 · 카톡·현장 수령 서류 직접 첨부
            </p>
          </div>
          <span className="text-2xl font-black text-[#3182f6] tabular-nums">{progress.percent}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3182f6] to-[#60a5fa] transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          현재 서류 취합률 {progress.percent}%
        </p>
      </div>

      {DOC_CATEGORY_ORDER.map((category) => {
        const slots = slotsForDocCategory(category, diseaseCategory);
        const catProgress = progress.byCategory[category];
        return (
          <section key={category} className="mb-5 last:mb-0">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
              <h4 className="text-[13px] font-black text-[#0f2d5e]">
                {DOC_CATEGORY_LABELS[category]}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                {catProgress.collected}/{catProgress.total} ({catProgress.percent}%)
              </span>
            </div>
            {category === "medical" && diseaseCategory && (
              <p className="text-[10px] text-slate-500 mb-2">
                {diseaseCategory} 카테고리에 필요한 서류만 표시됩니다.
              </p>
            )}
            {category === "institution" && (
              <p className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                파로스 노무사가 공단·기관 발급 서류를 직접 업로드하는 영역입니다.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {slots.map((slot) => (
                <DocSlotRow
                  key={slot.id}
                  leadId={leadId}
                  slot={slot}
                  collected={isSlotCollected(slot, docsStatus, docFiles, otherDocs)}
                  docFiles={docFiles}
                  otherDocs={otherDocs}
                  disabled={isUploading}
                  onDocsUpdated={onDocsUpdated}
                  onOtherDocsUpdated={onOtherDocsUpdated}
                  onUploadStart={beginUpload}
                  onUploadEnd={endUpload}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <OtherDocsBulkSection
        leadId={leadId}
        otherDocs={otherDocs}
        disabled={isUploading}
        onOtherDocsUpdated={onOtherDocsUpdated}
        onUploadStart={beginUpload}
        onUploadEnd={endUpload}
      />

      <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
        <Eye className="w-3 h-3" />
        위임장/약정서는 전자서명 PDF로 별도 관리됩니다. 항목당 여러 파일을 한 번에 선택해 업로드할 수 있습니다.
      </p>
    </div>
  );
}

/** @deprecated — 하위 호환 export */
export { AdminDocumentCollectionPanel as default };
