import type { Metadata } from "next";
import { Suspense } from "react";
import { metadataBase, OG_SITE_NAME, SITE_URL } from "@/lib/og-metadata";

const PARTNER_OG_TITLE = "노무법인 파로스 전산시스템";

const PARTNER_OG_DESCRIPTION =
  "노무법인 파로스 공식 파트너 및 제휴 파트너 전용 업무 전산망입니다. 로그인 및 회원가입을 진행해 주세요.";

const PARTNER_OG_IMAGE =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop";

/** 파트너 로그인(/login) 카카오·OG — 회원가입과 동일한 파트너 전산망 미리보기 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase,
  title: PARTNER_OG_TITLE,
  description: PARTNER_OG_DESCRIPTION,
  openGraph: {
    title: PARTNER_OG_TITLE,
    description: PARTNER_OG_DESCRIPTION,
    siteName: OG_SITE_NAME,
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}/login`,
    images: [PARTNER_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PARTNER_OG_TITLE,
    description: PARTNER_OG_DESCRIPTION,
    images: [PARTNER_OG_IMAGE],
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
