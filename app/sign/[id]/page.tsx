import type { Metadata } from "next";
import { StandaloneWeimSignClient } from "@/components/StandaloneWeimSignClient";

export const metadata: Metadata = {
  title: "위임장 전자서명 | 노무법인 파로스",
  robots: { index: false, follow: false },
};

export default async function StandaloneWeimSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-[100dvh] bg-white">
      <StandaloneWeimSignClient leadId={id} />
    </div>
  );
}
