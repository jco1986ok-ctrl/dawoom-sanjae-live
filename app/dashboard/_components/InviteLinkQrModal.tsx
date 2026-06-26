"use client";

import { useCallback, useRef } from "react";
import { Download, QrCode, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
  downloadFileName: string;
}

function downloadCanvasWithPadding(canvas: HTMLCanvasElement, filename: string) {
  const padding = 40;
  const qrSize = canvas.width;
  const out = document.createElement("canvas");
  out.width = qrSize + padding * 2;
  out.height = qrSize + padding * 2;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, padding, padding);

  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = out.toDataURL("image/png");
  link.click();
}

/** 초대·접수 링크 QR코드 보기 + PNG 다운로드 */
export default function InviteLinkQrModal({
  open,
  onOpenChange,
  url,
  title,
  description,
  downloadFileName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR코드를 불러오지 못했습니다.");
      return;
    }
    try {
      downloadCanvasWithPadding(canvas, downloadFileName);
      toast.success("QR코드 이미지가 다운로드되었습니다.");
    } catch {
      toast.error("다운로드에 실패했습니다. 다시 시도해 주세요.");
    }
  }, [downloadFileName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#0f2d5e]" />
            {title}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-6 bg-slate-50/80 flex flex-col items-center gap-5">
          {description && (
            <p className="text-sm text-slate-600 text-center break-keep leading-relaxed max-w-sm">
              {description}
            </p>
          )}

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <QRCodeCanvas
              ref={canvasRef}
              value={url}
              size={256}
              level="H"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center break-all max-w-[280px] leading-relaxed">
            {url}
          </p>

          <button
            type="button"
            onClick={handleDownload}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3
              rounded-xl font-bold text-sm sm:text-base bg-[#0f2d5e] hover:bg-[#1a3d7a]
              active:scale-[0.98] text-white shadow-md transition-all"
          >
            <Download className="w-4 h-4 shrink-0" />
            ⬇️ QR코드 이미지 다운로드
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
