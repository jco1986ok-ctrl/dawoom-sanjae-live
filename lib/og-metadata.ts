import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

/** 카카오 크롤러용 프로덕션 도메인 (VERCEL_URL 프리뷰 사용 금지) */
export const SITE_URL = getSiteUrl();

export const metadataBase = new URL(SITE_URL);

/** public/og-landing.jpg → 브라우저 경로 /og-landing.jpg (public 접두사 X) */
export const OG_IMAGE_PATH = "/og-landing.jpg";

export const OG_IMAGE_ALT = "업무상 질병 산재 진단";

export const OG_IMAGE_ENTRY = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
  type: "image/jpeg" as const,
} as const;

export const DEFAULT_OG_DESCRIPTION =
  "소음성 난청, 관절염, 디스크... 평생 일하며 병든 내 몸, 정당한 산재 보상금을 놓치고 계신 건 아닌지 지금 바로 무료로 확인해보세요!";

export const DEFAULT_OG_TITLE = "질병산재 전문 노무법인 파로스 | 1분 무료 진단";

export const OG_SITE_NAME = "노무법인 파로스";

/** title → document title, openGraph.title, twitter.title 에 동일 값 적용 */
export function buildPageMetadata(title: string, description: string): Metadata {
  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: OG_SITE_NAME,
      type: "website",
      locale: "ko_KR",
      url: SITE_URL,
      images: [OG_IMAGE_ENTRY],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}
