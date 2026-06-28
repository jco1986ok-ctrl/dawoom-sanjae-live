"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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

/**
 * react-daum-postcode embed — window.open 없이 레이어 모달.
 * 모바일: 전체 화면 / 데스크톱: 하단 시트
 */
export function DaumAddressSearchOverlay({ open, onClose, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setEmbedKey((k) => k + 1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const handleComplete = (result: DaumPostcodeResult) => {
    onSelect(result);
    window.setTimeout(onClose, 120);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="daum-postcode-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100000] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="주소 검색"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="주소 검색 닫기"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
            className="relative z-10 flex w-full flex-col bg-white shadow-2xl
              h-[100dvh] max-h-[100dvh]
              sm:h-[min(85dvh,720px)] sm:max-w-lg sm:rounded-3xl sm:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#EEF0F3] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="text-[16px] font-bold text-[#191F28] tracking-[-0.02em]">주소 검색</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F4F6] text-[#4E5968]"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              className="flex-1 min-h-0 w-full"
              style={{ minHeight: "calc(100dvh - 8.5rem)" }}
            >
              <DaumPostcode
                key={embedKey}
                autoClose={false}
                style={{ width: "100%", height: "100%", minHeight: 360 }}
                onComplete={handleComplete}
              />
            </div>

            <footer className="shrink-0 border-t border-[#EEF0F3] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] py-3.5 text-[15px] font-semibold text-[#4E5968]"
              >
                닫기
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
