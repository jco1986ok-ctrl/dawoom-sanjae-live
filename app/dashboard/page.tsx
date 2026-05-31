import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const ROLE_ROUTE: Record<UserRole, string> = {
  총괄공식파트너: "/dashboard/head-partner",
  총판영업자:     "/dashboard/master",
  하위영업자:     "/dashboard/agent",
  관리자:         "/dashboard/admin",
  노무사:         "/dashboard/general-attorney",  // 배당받은 사건만 열람
  대표노무사:     "/dashboard/head-attorney",
};

export default async function DashboardIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  redirect(role ? ROLE_ROUTE[role] : "/login");
}
