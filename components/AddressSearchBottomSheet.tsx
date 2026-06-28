"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

/** 고객접수폼(DynamicForm)과 동일한 주소 검색 바텀시트 */
export function AddressSearchBottomSheet({ open, onClose, onComplete }: Props) {
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center"
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
            className="relative z-10 w-full max-w-md h-[85vh] bg-white rounded-t-3xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6]">
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
                  onComplete(result);
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
