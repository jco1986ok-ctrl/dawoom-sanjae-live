"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { PDF_PAGE_HEIGHT, PDF_PAGE_WIDTH } from "@/lib/pdf-layout-shared";
import type { PdfTemplateName } from "@/lib/pdf-layout-shared";

export interface PdfViewSize {
  width: number;
  height: number;
  scale: number;
}

interface Props {
  template: PdfTemplateName;
  onSizeChange?: (size: PdfViewSize) => void;
  overlay?: ReactNode;
}

function computeDisplaySize(containerWidth: number, containerHeight: number): { width: number; height: number } {
  const pageRatio = PDF_PAGE_HEIGHT / PDF_PAGE_WIDTH;
  const maxWidth = Math.max(containerWidth, 280);
  const maxHeight =
    containerHeight > 200
      ? containerHeight
      : typeof window !== "undefined"
        ? Math.min(window.innerHeight * 0.78, PDF_PAGE_HEIGHT)
        : PDF_PAGE_HEIGHT;

  let width = maxWidth;
  let height = width * pageRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height / pageRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

function isRenderCancelledError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "RenderingCancelledException" ||
    err.message.includes("cancelled") ||
    err.message.includes("same canvas")
  );
}

export default function PdfTemplateCanvas({ template, onSizeChange, overlay }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSizeChangeRef = useRef(onSizeChange);
  onSizeChangeRef.current = onSizeChange;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null = null;
    let renderTask: import("pdfjs-dist").RenderTask | null = null;
    let renderGeneration = 0;
    let lastRenderedSize = { width: 0, height: 0 };
    let renderChain: Promise<void> = Promise.resolve();

    const cancelActiveRender = async () => {
      if (!renderTask) return;
      const task = renderTask;
      renderTask = null;
      task.cancel();
      await task.promise.catch(() => undefined);
    };

    const runRender = async (showSpinner: boolean) => {
      const generation = ++renderGeneration;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas || cancelled) return;

      const containerWidth = wrap.clientWidth || PDF_PAGE_WIDTH;
      const containerHeight =
        wrap.clientHeight > 200
          ? wrap.clientHeight
          : typeof window !== "undefined"
            ? window.innerHeight * 0.78
            : PDF_PAGE_HEIGHT;
      const { width: displayWidth, height: displayHeight } = computeDisplaySize(containerWidth, containerHeight);

      if (
        lastRenderedSize.width === displayWidth &&
        lastRenderedSize.height === displayHeight &&
        !showSpinner
      ) {
        return;
      }

      if (showSpinner) setLoading(true);
      setError(null);

      await cancelActiveRender();
      if (cancelled || generation !== renderGeneration) return;

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        if (!pdfDoc) {
          pdfDoc = await pdfjs.getDocument(`/${template}.pdf`).promise;
        }
        if (cancelled || generation !== renderGeneration) return;

        const page = await pdfDoc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = displayWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTask = task;
        await task.promise;
        renderTask = null;

        if (cancelled || generation !== renderGeneration) return;

        lastRenderedSize = { width: displayWidth, height: displayHeight };
        setDisplaySize({ width: displayWidth, height: displayHeight });
        onSizeChangeRef.current?.({
          width: displayWidth,
          height: displayHeight,
          scale: displayWidth / PDF_PAGE_WIDTH,
        });
      } catch (err) {
        if (cancelled || generation !== renderGeneration) return;
        if (isRenderCancelledError(err)) return;
        setError(err instanceof Error ? err.message : "PDF 렌더 실패");
      } finally {
        if (!cancelled && generation === renderGeneration) {
          setLoading(false);
        }
      }
    };

    const scheduleRender = (showSpinner: boolean) => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderChain = renderChain
          .then(() => runRender(showSpinner))
          .catch(() => undefined);
      }, showSpinner ? 0 : 150);
    };

    const wrap = wrapRef.current;
    if (wrap) {
      observer = new ResizeObserver(() => {
        scheduleRender(false);
      });
      observer.observe(wrap);
    }

    scheduleRender(true);

    return () => {
      cancelled = true;
      renderGeneration += 1;
      if (resizeTimer) clearTimeout(resizeTimer);
      observer?.disconnect();
      void cancelActiveRender();
      pdfDoc?.destroy?.();
    };
  }, [template]);

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <div
        className="relative mx-auto"
        style={
          displaySize
            ? { width: displaySize.width, height: displaySize.height }
            : { width: "100%", maxWidth: PDF_PAGE_WIDTH, aspectRatio: `${PDF_PAGE_WIDTH}/${PDF_PAGE_HEIGHT}` }
        }
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        <canvas ref={canvasRef} className="block bg-white shadow-md" />
        {overlay && <div className="absolute inset-0 z-20">{overlay}</div>}
      </div>
    </div>
  );
}
