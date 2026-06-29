import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import { isDashboardV2MasterRole } from "@/lib/dashboard-v2-access";
import V2DashboardNav from "./_components/V2DashboardNav";
import DashboardNotices from "../dashboard/_components/DashboardNotices";
import { DASHBOARD_SHELL_X } from "../dashboard/_components/dashboard-list-layout";
import InAppBrowserEscape from "@/components/pwa/InAppBrowserEscape";
import { fetchRecentNotices } from "../dashboard/_actions/notices";
import V2SandboxBanner from "./_components/V2SandboxBanner";
import { pwaAssetUrl } from "@/lib/pwa-asset-version";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "V2 테스트 보드 | 노무법인 파로스",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: pwaAssetUrl("/favicon.ico"), sizes: "32x32", type: "image/png" },
      { url: pwaAssetUrl("/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: pwaAssetUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export default async function DashboardV2Layout({
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
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!isDashboardV2MasterRole(profile.role as string)) {
    redirect("/dashboard");
  }

  const notices = await fetchRecentNotices(2);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <V2DashboardNav user={profile as AppUser} />
      <main className="flex-1 w-full">
        <div className={`${DASHBOARD_SHELL_X} pt-4 flex flex-col gap-3`}>
          <V2SandboxBanner />
          <DashboardNotices notices={notices} isAdmin />
        </div>
        <div className={`${DASHBOARD_SHELL_X} py-2`}>{children}</div>
      </main>
      <InAppBrowserEscape />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
