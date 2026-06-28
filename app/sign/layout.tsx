import SignInAppBrowserHint from "@/components/SignInAppBrowserHint";

/** 위임장 서명 — 고객 전용 경량 레이아웃 (대시보드 네비·PWA 배너 없음) */
export default function SignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignInAppBrowserHint />
      {children}
    </>
  );
}
