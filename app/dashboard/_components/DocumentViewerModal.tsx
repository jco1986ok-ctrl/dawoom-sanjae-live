"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, Loader2, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildDocDownloadUrl,
  buildDocPreviewUrl,
  getPrimaryDocFile,
  isImageMime,
  isPdfMime,
  type LeadDocKey,
} from "@/lib/lead-doc-files";

export interface DocumentViewerTarget {
  leadId: string;
  docKey: LeadDocKey;
  title: string;
  label: string;
  fileName: string;
  mimeType: string;
  fileIndex?: number;
}

interface Props {
  target: DocumentViewerTarget | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentViewerModal({ target, open, onClose }: Props) {
  const [loadError, setLoadError] = useState(false);
  const [checking, setChecking] = useState(false);

  const previewUrl = target
    ? buildDocPreviewUrl(target.leadId, target.docKey, target.fileIndex ?? 0)
    : "";
  const downloadUrl = target
    ? buildDocDownloadUrl(target.leadId, target.docKey, target.fileIndex ?? 0)
    : "";

  useEffect(() => {
    if (!open || !target) {
      setLoadError(false);
      setChecking(false);
      return;
    }

    setLoadError(false);
    setChecking(true);
    fetch(previewUrl, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setChecking(false));
  }, [open, target, previewUrl]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onClose();
    },
    [onClose],
  );

  if (!target) return null;

  const showImage = isImageMime(target.mimeType) && !loadError;
  const showPdf = isPdfMime(target.mimeType) && !loadError;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[100] w-[min(96vw,56rem)] max-h-[92vh]",
            "-translate-x-1/2 -translate-y-1/2 flex flex-col",
            "rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-bold text-slate-900 truncate">
                {target.title}
              </DialogPrimitive.Title>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{target.fileName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={downloadUrl}
                download={target.fileName}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg
                  bg-[#3182f6] text-white hover:bg-[#1B6FE8] transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                ⬇️ 이 서류 다운로드
              </a>
              <DialogPrimitive.Close
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="닫기"
              >
                <XIcon className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="relative flex-1 min-h-[50vh] max-h-[calc(92vh-8rem)] bg-slate-100 overflow-auto">
            {checking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#3182f6]" />
                <p className="text-sm">서류 불러오는 중…</p>
              </div>
            )}

            {!checking && showImage && (
              <img
                src={previewUrl}
                alt={target.title}
                className="w-full h-full object-contain p-4"
                onError={() => setLoadError(true)}
              />
            )}

            {!checking && showPdf && (
              <iframe
                src={previewUrl}
                title={target.title}
                className="w-full h-full min-h-[50vh] border-0 bg-white"
                onError={() => setLoadError(true)}
              />
            )}

            {!checking && loadError && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[50vh] text-center">
                <p className="text-sm text-slate-600">
                  브라우저에서 미리보기를 표시할 수 없습니다.
                </p>
                <a
                  href={downloadUrl}
                  download={target.fileName}
                  className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-lg
                    bg-[#3182f6] text-white hover:bg-[#1B6FE8] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  ⬇️ 이 서류 다운로드
                </a>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-white flex justify-end">
            <a
              href={downloadUrl}
              download={target.fileName}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg
                bg-[#3182f6] text-white hover:bg-[#1B6FE8] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ⬇️ 이 서류 다운로드
            </a>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
