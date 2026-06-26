"use client";

import { useState } from "react";
import { Download, Loader2, XIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  buildOtherDocDownloadUrl,
  buildOtherDocPreviewUrl,
  type OtherDocEntry,
} from "@/lib/lead-other-docs";
import { isImageMime, isPdfMime } from "@/lib/lead-doc-files";

interface OtherDocViewerTarget {
  leadId: string;
  index: number;
  fileName: string;
  mimeType: string;
}

function OtherDocViewerModal({
  target,
  open,
  onClose,
}: {
  target: OtherDocViewerTarget | null;
  open: boolean;
  onClose: () => void;
}) {
  const previewUrl = target ? buildOtherDocPreviewUrl(target.leadId, target.index) : "";
  const downloadUrl = target ? buildOtherDocDownloadUrl(target.leadId, target.index) : "";

  if (!target) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/60" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[81] w-[min(96vw,900px)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2",
            "rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden",
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <DialogPrimitive.Title className="text-sm font-bold text-slate-900 truncate pr-4">
              📄 {target.fileName}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                다운로드
              </a>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="닫기"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-slate-900/5 flex items-center justify-center p-2 overflow-auto">
            {isPdfMime(target.mimeType) ? (
              <iframe
                src={previewUrl}
                title={target.fileName}
                className="w-full h-[min(70vh,720px)] rounded-lg bg-white border border-slate-200"
              />
            ) : isImageMime(target.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={target.fileName}
                className="max-w-full max-h-[min(70vh,720px)] object-contain rounded-lg"
              />
            ) : (
              <p className="text-sm text-slate-500 p-6">
                미리보기를 지원하지 않는 형식입니다. 다운로드해 주세요.
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface Props {
  leadId: string;
  otherDocs: OtherDocEntry[];
  interactive?: boolean;
}

/** 기타 서류 뱃지 목록 — 클릭 시 미리보기·다운로드 */
export function OtherDocsBadges({ leadId, otherDocs, interactive = true }: Props) {
  const [viewer, setViewer] = useState<OtherDocViewerTarget | null>(null);

  if (otherDocs.length === 0) {
    return (
      <p className="text-[11px] text-slate-400">등록된 기타 서류가 없습니다.</p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {otherDocs.map((doc, index) => (
          <button
            key={`${doc.storagePath}-${index}`}
            type="button"
            disabled={!interactive}
            onClick={() =>
              interactive &&
              setViewer({
                leadId,
                index,
                fileName: doc.fileName,
                mimeType: doc.mimeType,
              })
            }
            className={cn(
              "inline-flex items-center gap-1 text-xs leading-tight px-2.5 py-1.5 rounded-md",
              "bg-amber-50 text-amber-900 border border-amber-200 font-medium max-w-[220px]",
              interactive &&
                "cursor-pointer hover:scale-105 hover:bg-amber-100 transition-transform active:scale-[0.98]",
            )}
            title={doc.fileName}
          >
            <span aria-hidden>📄</span>
            <span className="truncate">{doc.fileName}</span>
          </button>
        ))}
      </div>
      {viewer && (
        <OtherDocViewerModal
          target={viewer}
          open={Boolean(viewer)}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
