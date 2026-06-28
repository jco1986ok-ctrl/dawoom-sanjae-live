"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  embedDaumAddressSearch,
  loadDaumPostcodeScript,
  pickDaumAddressBase,
  type DaumPostcodeResult,
} from "@/lib/daum-postcode";
import { isInAppBrowser } from "@/components/pwa/in-app-browser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: DaumPostcodeResult) => void;
};

export function DaumAddressSearchOverlay({ open, onClose, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const onSelectRef = useRef(onSelect);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  onCloseRef.current = onClose;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!open) return;
    void loadDaumPostcodeScript().catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el || cancelled) return;

      void embedDaumAddressSearch(
        el,
        (data) => {
          onSelectRef.current(data);
          onCloseRef.current();
        },
        () => onCloseRef.current(),
      )
        .then(() => {
          if (!cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setLoading(false);
            setError(
              isInAppBrowser()
                ? "주소 검색을 열지 못했습니다. 카카오톡·네이버 앱이면 우측 상단 ··· 메뉴에서 Safari·Chrome으로 열어 주세요."
                : "주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
        });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="주소 검색"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[#EEF0F3] px-4 py-3 safe-area-top">
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

      {isInAppBrowser() && (
        <p className="shrink-0 bg-[#FFF8E6] px-4 py-2 text-[12px] leading-relaxed text-[#8B6914]">
          검색이 안 되면 ··· 또는 공유 버튼에서 <strong>Safari·Chrome으로 열기</strong>를 선택해 주세요.
        </p>
      )}

      {error && (
        <div className="shrink-0 px-4 py-3">
          <p className="text-[13px] font-medium text-red-500">{error}</p>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#3182F6]" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full min-h-[60vh]" />
      </div>
    </div>
  );
}

export { pickDaumAddressBase };
