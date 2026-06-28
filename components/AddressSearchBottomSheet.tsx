"use client";

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
 * DynamicForm ContactScreen 주소검색과 동일 (복사본).
 * embedReady·portal·픽셀 높이 등 추가 로직 없음.
 */
export function AddressSearchBottomSheet({ open, onClose, onComplete }: Props) {
  return (
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
              <p className="text-[16px] font-bold text-[#191F28] tracking-[-0.02em]">
                주소 검색
              </p>
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
    </AnimatePresence>
  );
}
