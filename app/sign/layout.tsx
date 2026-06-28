import Script from "next/script";
import SignInAppBrowserHint from "@/components/SignInAppBrowserHint";
import { DAUM_POSTCODE_SCRIPT_SRC } from "@/lib/daum-postcode";

/** 위임장 서명 — 고객 전용 경량 레이아웃 (대시보드 네비·PWA 배너 없음) */
export default function SignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src={DAUM_POSTCODE_SCRIPT_SRC} strategy="afterInteractive" />
      <SignInAppBrowserHint />
      {children}
    </>
  );
}
