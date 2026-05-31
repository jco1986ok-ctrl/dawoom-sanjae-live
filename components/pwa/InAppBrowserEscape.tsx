"use client";

import { useEffect, useState } from "react";
import {
  detectPlatform,
  escapeToChromeOnAndroid,
  isInAppBrowser,
} from "./in-app-browser";

/**
 * 카카오톡·네이버·라인 등 인앱 브라우저 → Chrome/Safari 강제 유도.
 * PWA 설치·세션 정상화를 위해 외부 브라우저 탈출이 선행되어야 함.
 */
export default function InAppBrowserEscape() {
  const [showIosBlocker, setShowIosBlocker] = useState(false);

  useEffect(() => {
    if (!isInAppBrowser()) return;

    const platform = detectPlatform();

    if (platform === "android") {
      escapeToChromeOnAndroid();
      return;
    }

    if (platform === "ios") {
      setShowIosBlocker(true);
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, []);

  if (!showIosBlocker) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0a1f42]/95 backdrop-blur-sm px-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="in-app-escape-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-red-600 to-red-700 px-5 py-4">
          <p id="in-app-escape-title" className="text-white font-black text-lg leading-snug">
            🚨 외부 브라우저로 열어주세요
          </p>
        </div>
        <div className="px-5 py-5 space-y-4 text-sm text-foreground leading-relaxed">
          <p className="font-bold text-red-600">
            현재 화면(카카오톡·네이버·라인 등)에서는 앱 설치와 로그인이 정상 작동하지
            않습니다.
          </p>
          <p>
            🚨 현재 화면에서는 앱 설치가 불가능합니다. 화면 우측 하단의{" "}
            <strong className="text-primary">[점 3개]</strong> 또는{" "}
            <strong className="text-primary">[공유]</strong> 버튼을 누르고{" "}
            <strong className="text-primary underline">&apos;Safari로 열기&apos;</strong>를
            선택해 주세요!
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-xs">
            <li>우측 하단 ··· 또는 공유(⍗) 버튼 탭</li>
            <li>
              <strong className="text-foreground">Safari로 열기</strong> 선택
            </li>
            <li>Safari에서 다시 로그인 후 앱 설치 진행</li>
          </ol>
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-xl border border-border bg-muted py-3 text-sm font-semibold text-foreground"
          >
            Safari로 연 뒤 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
