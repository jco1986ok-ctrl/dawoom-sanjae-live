import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import {
  buildPageMetadata,
  DEFAULT_OG_DESCRIPTION,
} from "@/lib/og-metadata";
import { FALLBACK_REFERRER_DISPLAY } from "@/lib/capture-referrer";
import { normalizePartnerName } from "@/lib/referral-resolve";

type PageProps = {
  searchParams: Promise<{ ref?: string; name?: string }>;
};

/** 카카오·OG 제목 — URL ?name= 은 무시, 항상 비실명 fallback */
function buildOgTitle(): string {
  return `🚨 혹시 나도 업무상 질병? [${FALLBACK_REFERRER_DISPLAY}]가 챙겨드리는 '숨은 업무상 질병 보상금' 찾기`;
}

export async function generateMetadata(): Promise<Metadata> {
  const title = buildOgTitle();
  return buildPageMetadata(title, DEFAULT_OG_DESCRIPTION);
}

export default async function HomePage({ searchParams }: PageProps) {
  const { ref, name } = await searchParams;
  return (
    <HomeClient
      referralCode={ref?.trim() || null}
      partnerName={normalizePartnerName(name)}
    />
  );
}
