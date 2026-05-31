"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isInAppBrowser } from "./in-app-browser";

const DESKTOP_INSTALL_WARNING =
  "🚨 필수 체크: 앱 설치 팝업이 뜨면, 세 번째에 있는 [○ 바탕 화면 바로 가기 만들기]를 반드시 체크(✔️)하신 후 '허용'을 눌러주세요! 바탕화면에 아이콘이 있어야 실적/수수료 알림을 놓치지 않습니다!";

const ANDROID_FALLBACK_ALERT =
  "브라우저 메뉴(⋮)에서 [앱 설치] 또는 [홈 화면에 추가]를 선택해 주세요. Chrome 브라우저 사용을 권장합니다.";

const DESKTOP_FALLBACK_ALERT =
  "브라우저 주소창 우측 끝에 있는 [앱 설치] 아이콘을 누르거나, 메뉴에서 [바탕화면에 추가]를 선택해주세요!";

type DevicePlatform = "android" | "ios" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): DevicePlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  const isClassicIos = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isClassicIos || isIpadOs) return "ios";
  return "desktop";
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

interface PwaInstallBannerProps {
  userId: string;
  role: string;
}

export default function PwaInstallBanner(_props: PwaInstallBannerProps) {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [platform, setPlatform] = useState<DevicePlatform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
    setIsStandalone(isStandaloneDisplay());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore */
      });
    }

    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = () => setIsStandalone(isStandaloneDisplay());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as BeforeInstallPromptEvent;
      setInstallReady(true);
    };

    standaloneMq.addEventListener("change", onStandaloneChange);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      standaloneMq.removeEventListener("change", onStandaloneChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installing) return;

    if (platform === "ios") {
      setIosModalOpen(true);
      return;
    }

    if (platform === "android") {
      const promptEvent = installPromptRef.current;
      if (!promptEvent) {
        window.alert(ANDROID_FALLBACK_ALERT);
        return;
      }

      setInstalling(true);
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        installPromptRef.current = null;
        setInstallReady(false);
      } catch {
        window.alert(ANDROID_FALLBACK_ALERT);
      } finally {
        setInstalling(false);
      }
      return;
    }

    const promptEvent = installPromptRef.current;
    if (!promptEvent) {
      window.alert(DESKTOP_FALLBACK_ALERT);
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      installPromptRef.current = null;
      setInstallReady(false);
    } catch {
      window.alert(DESKTOP_FALLBACK_ALERT);
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted || isStandalone || isInAppBrowser()) return null;

  const isMobile = platform === "android" || platform === "ios";
  const buttonLabel = isMobile
    ? "📱 스마트폰 홈 화면에 파로스 앱 설치하기"
    : installing
      ? "설치 창 여는 중…"
      : "💻 파로스 앱 설치하기";

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] border-t-2 border-primary/20 bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        role="region"
        aria-label="앱 설치 안내"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-2">
          {platform === "desktop" && (
            <p
              className="text-red-500 text-xs sm:text-sm font-bold leading-snug rounded-lg border border-red-300 bg-red-50 px-3 py-2.5"
              role="alert"
            >
              {DESKTOP_INSTALL_WARNING}
            </p>
          )}

          {platform === "android" && (
            <p className="text-xs text-muted-foreground leading-snug px-1">
              {installReady
                ? "아래 버튼을 누르면 바로 앱 설치 창이 열립니다."
                : "Chrome에서 설치가 가능합니다. 버튼을 눌러 설치를 시도해 주세요."}
            </p>
          )}

          {platform === "ios" && (
            <p className="text-xs text-blue-700 font-medium leading-snug px-1">
              🍎 Safari에서 아래 버튼을 누르면 홈 화면 추가 방법을 안내해 드립니다.
            </p>
          )}

          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-bold px-4 py-3.5
                       active:scale-[0.98] transition-transform cursor-pointer hover:brightness-110
                       shadow-lg shadow-primary/25"
          >
            {installing ? "설치 창 여는 중…" : buttonLabel}
          </button>
        </div>
      </div>

      <Dialog open={iosModalOpen} onOpenChange={setIosModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-[#0f2d5e] to-[#1a4480] px-5 pt-6 pb-5 text-left">
            <DialogTitle className="text-white text-lg font-black leading-snug">
              🍎 아이폰 앱 설치 안내
            </DialogTitle>
            <DialogDescription className="sr-only">
              Safari에서 홈 화면에 추가하는 방법
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-5 space-y-4 text-sm text-foreground leading-relaxed">
            <p className="font-semibold">
              1. 브라우저 맨 하단의{" "}
              <strong className="text-primary">[공유(가운데 화살표)]</strong> 버튼을 누르세요.
            </p>
            <p className="font-semibold">
              2. 메뉴를 내려서{" "}
              <strong className="text-primary">[➕ 홈 화면에 추가]</strong>를 선택해주세요!
            </p>
            <p className="text-xs text-muted-foreground">
              설치 후 홈 화면의 파로 아이콘으로 대시보드에 바로 접속할 수 있습니다.
            </p>
          </div>
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => setIosModalOpen(false)}
              className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-bold py-3
                         active:scale-[0.98] transition-transform"
            >
              확인했습니다
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIosModalOpen(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
