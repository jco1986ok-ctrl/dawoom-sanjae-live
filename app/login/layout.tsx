import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "공식 파트너 전용 | 노무법인 파로스",
  description: "노무법인 파로스 내부 관리 시스템입니다.",
  openGraph: {
    title: "공식 파트너 전용 | 노무법인 파로스",
    description: "노무법인 파로스 내부 관리 시스템입니다.",
    siteName: "노무법인 파로스",
    type: "website",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          로그인 화면 불러오는 중…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
