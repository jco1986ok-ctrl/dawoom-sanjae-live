export type DevicePlatform = "android" | "ios" | "desktop";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const ANDROID_FALLBACK_ALERT =
  "브라우저 메뉴(⋮)에서 [앱 설치] 또는 [홈 화면에 추가]를 선택해 주세요. Chrome 브라우저 사용을 권장합니다.";

export const DESKTOP_FALLBACK_ALERT =
  "브라우저 주소창 우측의 [앱 설치] 아이콘을 누르거나, 메뉴에서 [바탕화면에 추가]를 선택해 주세요.";

export const ALREADY_INSTALLED_ALERT =
  "이미 앱으로 실행 중입니다. 다른 기기에 설치하거나 바로가기를 다시 만들려면 Chrome·Safari에서 pharos-sanjae.com 에 접속한 뒤 [앱 설치]를 눌러 주세요.";

export function detectPlatform(): DevicePlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  const isClassicIos = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isClassicIos || isIpadOs) return "ios";
  return "desktop";
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}
