import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import HomeClient from "@/components/HomeClient";

// ── 기본 메타 (파트너 코드 없을 때) ─────────────────────────
const DEFAULT_TITLE       = "직업병 보상지원센터 | 무료 업무상 질병 산재 자가진단";
const DEFAULT_DESCRIPTION = "몰라서 못 받는 업무상 질병 산재 보상금, 1분 만에 나의 업무상 질병 산재 승인 가능성을 무료로 확인해 보세요.";
const SITE_NAME           = "직업병 보상지원센터";

type PageProps = {
  searchParams: Promise<{ ref?: string }>;
};

// ── 파트너 이름 조회 헬퍼 ────────────────────────────────────
async function fetchPartnerName(ref: string): Promise<string | null> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("users")
      .select("name")
      .eq("agent_id", ref)
      .eq("is_active", true)
      .maybeSingle();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

// ── 동적 메타데이터 생성 ─────────────────────────────────────
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { ref } = await searchParams;

  const partnerName = ref ? await fetchPartnerName(ref) : null;

  if (!partnerName) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        siteName: SITE_NAME,
        type: "website",
      },
    };
  }

  const title       = `파로스 노무법인 VIP 제휴파트너 [${partnerName}]님의 특별한 초대`;
  const description = `${partnerName}님이 고객님의 잃어버린 업무상 질병 산재 보상금을 끝까지 챙겨드립니다. 지금 바로 숨은 보상금을 1분 만에 무료로 확인해보세요!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

// ── 페이지 컴포넌트 (서버) ───────────────────────────────────
export default async function HomePage({ searchParams }: PageProps) {
  const { ref } = await searchParams;
  return <HomeClient referralCode={ref ?? null} />;
}
