import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import DashboardNav from "./_components/DashboardNav";
import DashboardNotices from "./_components/DashboardNotices";
import { DASHBOARD_SHELL_X } from "./_components/dashboard-list-layout";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import InAppBrowserEscape from "@/components/pwa/InAppBrowserEscape";
import { fetchRecentNotices } from "./_actions/notices";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { pwaAssetUrl } from "@/lib/pwa-asset-version";

export const metadata: Metadata = {
  title: "질병산재 전문 노무법인 파로스 | 1분 무료 진단",
  icons: {
    icon: [
      { url: pwaAssetUrl("/favicon.ico"), sizes: "32x32", type: "image/png" },
      { url: pwaAssetUrl("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: pwaAssetUrl("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: pwaAssetUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: pwaAssetUrl("/favicon.ico"), type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "노무법인 파로스",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // DB에 사용자 프로필이 없으면 로그아웃 후 로그인 페이지로
    await supabase.auth.signOut();
    redirect("/login");
  }

  const notices = await fetchRecentNotices(2);
  const isAdmin = profile.role === "관리자";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-28">
      <DashboardNav user={profile as AppUser} />
      <main className="flex-1 w-full">
        <div className={`${DASHBOARD_SHELL_X} pt-4`}>
          <DashboardNotices notices={notices} isAdmin={isAdmin} />
        </div>
        <div className={`${DASHBOARD_SHELL_X} py-2`}>
          {children}
        </div>
      </main>
      <PwaInstallBanner userId={user.id} role={profile.role} />
      <InAppBrowserEscape />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
