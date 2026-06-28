"use client";

import { useEffect, useState } from "react";
import { detectPlatform, isInAppBrowser } from "@/components/pwa/in-app-browser";

/** 위임장 서명 — 전체 화면 차단 대신 상단 안내 (주소 검색·서명 가능) */
export default function SignInAppBrowserHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isInAppBrowser()) return;
    setShow(true);
    document.body.style.overflow = "";
  }, []);

  if (!show) return null;

  const platform = detectPlatform();
  const browserHint =
    platform === "ios"
      ? "Safari로 열기"
      : platform === "android"
        ? "Chrome으로 열기"
        : "외부 브라우저로 열기";

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto bg-[#FFF0F0] border-b border-[#FFCCC7] px-4 py-2.5 shadow-sm">
        <p className="text-[12px] leading-relaxed text-[#CF1322]">
          카카오톡·네이버 앱에서는 주소 검색이 안 될 수 있습니다. ··· 또는 공유에서{" "}
          <strong>{browserHint}</strong>를 선택해 주세요.
        </p>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="mt-1 text-[11px] font-semibold text-[#8B95A1] underline"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
