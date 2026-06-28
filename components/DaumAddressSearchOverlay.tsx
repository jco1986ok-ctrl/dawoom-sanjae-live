"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import DaumPostcode from "react-daum-postcode";

export type DaumPostcodeResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
};

/** embed 컨테이너 고정 높이 — % 높이는 부모 레이아웃 전 0px이 되어 빈 화면 발생 */
const EMBED_HEIGHT =
  "calc(100svh - 3.25rem - 4.25rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))";

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
  const [embedReady, setEmbedReady] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setEmbedReady(false);
      return;
    }
    setEmbedKey((k) => k + 1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      setEmbedReady(false);
    };
  }, [open]);

  if (!mounted) return null;

  const handleComplete = (result: DaumPostcodeResult) => {
    onSelect(result);
    window.setTimeout(onClose, 120);
  };

  const handlePanelAnimationComplete = () => {
    if (open) setEmbedReady(true);
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
            onAnimationComplete={handlePanelAnimationComplete}
            className="relative z-10 flex w-full flex-col bg-white shadow-2xl
              h-[100svh] max-h-[100svh]
              sm:h-auto sm:max-w-lg sm:rounded-3xl sm:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex h-[3.25rem] shrink-0 items-center justify-between border-b border-[#EEF0F3] px-4 pt-[env(safe-area-inset-top)]">
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
              className="relative w-full overflow-hidden bg-white"
              style={{ height: EMBED_HEIGHT, minHeight: 320 }}
            >
              {!embedReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <Loader2 className="h-8 w-8 animate-spin text-[#3182F6]" />
                </div>
              )}
              {embedReady && (
                <DaumPostcode
                  key={embedKey}
                  autoClose={false}
                  style={{ width: "100%", height: EMBED_HEIGHT, minHeight: 320 }}
                  onComplete={handleComplete}
                />
              )}
            </div>

            <footer className="flex h-[4.25rem] shrink-0 items-center border-t border-[#EEF0F3] px-4 pb-[env(safe-area-inset-bottom)]">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] py-3 text-[15px] font-semibold text-[#4E5968]"
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
