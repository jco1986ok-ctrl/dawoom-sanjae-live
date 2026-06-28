"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import {
  embedDaumAddressSearch,
  loadDaumPostcodeScript,
  pickDaumAddressBase,
  type DaumPostcodeResult,
} from "@/lib/daum-postcode";

export type { DaumPostcodeResult };
export { pickDaumAddressBase };

const HEADER_PX = 56;
const FOOTER_PX = 72;

function measureEmbedHeight(): number {
  const vh = window.visualViewport?.height ?? window.innerHeight;
  return Math.max(320, Math.floor(vh - HEADER_PX - FOOTER_PX));
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: DaumPostcodeResult) => void;
};

/**
 * 카카오 우편번호 embed 레이어 — window.open 없음.
 * react-daum-postcode 대신 직접 embed + 픽셀 높이 (모바일 빈 화면 방지).
 */
export function DaumAddressSearchOverlay({ open, onClose, onSelect }: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);
  const embedGenRef = useRef(0);

  onSelectRef.current = onSelect;
  onCloseRef.current = onClose;

  useEffect(() => {
    setPortalReady(true);
    void loadDaumPostcodeScript().catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runEmbed = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    const gen = ++embedGenRef.current;
    setLoading(true);
    setError(null);

    const heightPx = measureEmbedHeight();

    try {
      await embedDaumAddressSearch(
        el,
        (data) => {
          onSelectRef.current(data);
          window.setTimeout(() => onCloseRef.current(), 80);
        },
        heightPx,
      );
      if (gen === embedGenRef.current) setLoading(false);
    } catch {
      if (gen === embedGenRef.current) {
        setLoading(false);
        setError("주소 검색을 불러오지 못했습니다. 닫기 후 다시 시도해 주세요.");
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      embedGenRef.current += 1;
      if (containerRef.current) containerRef.current.replaceChildren();
      setLoading(true);
      setError(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tryEmbed = () => {
      if (cancelled) return;
      attempts += 1;
      const el = containerRef.current;
      if (!el) {
        if (attempts < 20) requestAnimationFrame(tryEmbed);
        return;
      }
      void runEmbed();
    };

    requestAnimationFrame(tryEmbed);

    return () => {
      cancelled = true;
      embedGenRef.current += 1;
      containerRef.current?.replaceChildren();
    };
  }, [open, runEmbed]);

  if (!portalReady || !open) return null;

  const embedHeight = measureEmbedHeight();

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="주소 검색"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      <header
        className="flex shrink-0 items-center justify-between border-b border-[#EEF0F3] bg-white px-4"
        style={{ height: HEADER_PX, paddingTop: "env(safe-area-inset-top)" }}
      >
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

      <div className="relative shrink-0 w-full bg-white" style={{ height: embedHeight }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#3182F6]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
            <p className="text-[14px] font-medium text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void runEmbed()}
              className="rounded-xl bg-[#3182F6] px-5 py-2.5 text-[14px] font-semibold text-white"
            >
              다시 시도
            </button>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <footer
        className="mt-auto shrink-0 border-t border-[#EEF0F3] bg-white px-4 flex items-center"
        style={{ height: FOOTER_PX, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] py-3 text-[15px] font-semibold text-[#4E5968]"
        >
          닫기
        </button>
      </footer>
    </div>,
    document.body,
  );
}
