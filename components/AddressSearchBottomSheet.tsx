"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DaumPostcode from "react-daum-postcode";

export type AddressSearchResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (result: AddressSearchResult) => void;
};

/**
 * 고객접수폼(DynamicForm ContactScreen)과 동일 — portal 없이 fixed 바텀시트.
 * embed는 슬라이드 애니메이션 완료 후 + 픽셀 높이로 마운트 (빈 화면 방지).
 */
export function AddressSearchBottomSheet({ open, onClose, onComplete }: Props) {
  const [embedReady, setEmbedReady] = useState(false);
  const [embedHeightPx, setEmbedHeightPx] = useState(400);

  useEffect(() => {
    if (!open) {
      setEmbedReady(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      setEmbedReady(false);
    };
  }, [open]);

  const handlePanelAnimationComplete = () => {
    if (!open) return;
    const px = Math.max(320, Math.floor(window.innerHeight * 0.85 - 57));
    setEmbedHeightPx(px);
    setEmbedReady(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="주소 검색 닫기"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
            onAnimationComplete={handlePanelAnimationComplete}
            className="relative z-10 w-full max-w-md h-[85vh] bg-white rounded-t-3xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6] shrink-0">
              <p className="text-[16px] font-bold text-[#191F28] tracking-[-0.02em]">주소 검색</p>
              <button
                type="button"
                onClick={onClose}
                className="text-[14px] font-semibold text-[#8B95A1]"
              >
                닫기
              </button>
            </div>
            <div
              className="w-full shrink-0 overflow-hidden"
              style={{ height: embedHeightPx }}
            >
              {embedReady && (
                <DaumPostcode
                  key={embedHeightPx}
                  style={{ width: "100%", height: embedHeightPx }}
                  onComplete={(result) => {
                    onComplete(result);
                    onClose();
                  }}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
