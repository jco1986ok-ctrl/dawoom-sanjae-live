"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DaumPostcode from "react-daum-postcode";

export type DaumPostcodeResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
};

export function pickDaumAddressBase(result: DaumPostcodeResult): string {
  return result.roadAddress || result.jibunAddress || result.address || "";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: DaumPostcodeResult) => void;
};

/** DynamicForm과 동일 — react-daum-postcode embed + body portal */
export function DaumAddressSearchOverlay({ open, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="주소 검색 닫기"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md h-[85dvh] bg-white rounded-t-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#F2F4F6] px-5 py-4">
          <p className="text-[16px] font-bold text-[#191F28] tracking-[-0.02em]">주소 검색</p>
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-semibold text-[#8B95A1]"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <DaumPostcode
            style={{ width: "100%", height: "100%" }}
            onComplete={(result) => {
              onSelect(result);
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
