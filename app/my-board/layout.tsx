import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/lib/types";
import DashboardNav from "@/app/dashboard/_components/DashboardNav";
import { DASHBOARD_SHELL_X } from "@/app/dashboard/_components/dashboard-list-layout";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import InAppBrowserEscape from "@/components/pwa/InAppBrowserEscape";
import { Toaster } from "sonner";
import { pwaAssetUrl } from "@/lib/pwa-asset-version";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "내 업무 보드 | 노무법인 파로스",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: pwaAssetUrl("/favicon.ico"), sizes: "32x32", type: "image/png" }],
    apple: [{ url: pwaAssetUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export default async function MyBoardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-28">
      <DashboardNav user={profile as AppUser} />
      <main className="flex-1 w-full">
        <div className={`${DASHBOARD_SHELL_X} py-4`}>{children}</div>
      </main>
      <PwaInstallBanner userId={user.id} role={profile.role} />
      <InAppBrowserEscape />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
