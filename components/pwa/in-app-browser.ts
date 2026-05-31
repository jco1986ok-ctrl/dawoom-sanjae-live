export type DevicePlatform = "android" | "ios" | "desktop";

const IN_APP_UA =
  /KAKAOTALK|NAVER|Line\/|Instagram|FBAN|FBAV|Twitter/i;

export function detectPlatform(): DevicePlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  const isClassicIos = /iPad|iPhone|iPod/i.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isClassicIos || isIpadOs) return "ios";
  return "desktop";
}

/** 카카오톡·네이버·라인 등 인앱 브라우저 여부 */
export function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return IN_APP_UA.test(navigator.userAgent);
}

/** Android — Chrome 앱으로 강제 탈출 */
export function escapeToChromeOnAndroid(): void {
  const stripped = window.location.href.replace(/https?:\/\//i, "");
  window.location.href = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
}
