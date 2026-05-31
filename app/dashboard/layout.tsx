import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import DashboardNav from "./_components/DashboardNav";
import DashboardNotices from "./_components/DashboardNotices";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import InAppBrowserEscape from "@/components/pwa/InAppBrowserEscape";
import { fetchRecentNotices } from "./_actions/notices";

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    title: "파로스 전산",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
      <main className="flex-1 w-full mx-auto">
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <DashboardNotices notices={notices} isAdmin={isAdmin} />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-2">
          {children}
        </div>
      </main>
      <PwaInstallBanner userId={user.id} role={profile.role} />
      <InAppBrowserEscape />
    </div>
  );
}
