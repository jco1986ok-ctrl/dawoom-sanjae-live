"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  fromStatus: string;
  toStatus: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<{ success: boolean; error?: string }>;
}

/** 고객 상세 Dialog 위에 뜨도록 z-index를 높인 사유 입력 모달 */
export default function V2StatusChangeReasonModal({
  open,
  fromStatus,
  toStatus,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError("");
  }, [open, fromStatus, toStatus]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isPending, onClose]);

  const handleSave = () => {
    if (!reason.trim()) {
      setError("변경 사유를 입력해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await onConfirm(reason.trim());
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? "저장에 실패했습니다.");
      }
    });
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="v2-status-reason-title"
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>

        <h2 id="v2-status-reason-title" className="text-lg font-semibold text-slate-900 pr-8">
          상태 변경 사유
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{fromStatus}</span>
          {" → "}
          <span className="font-semibold text-[#0f2d5e]">{toStatus}</span>
          로 변경합니다. 사유는 상담 코멘트 히스토리에 시스템 로그로 기록됩니다.
        </p>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-600">변경 사유</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="예: 고객 통화 완료, 서류 추가 요청 등"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
            disabled={isPending}
          />
        </label>

        {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
              bg-[#0f2d5e] text-white hover:bg-[#1a3d7a] disabled:opacity-60 min-h-[44px]"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
