import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapUserRoleToTestRole } from "@/lib/dashboard-rbac";
import { loadUnifiedManagementData } from "@/lib/load-unified-management-data";
import UnifiedManagementDashboard from "../_components/UnifiedManagementDashboard";
import type { UserRole } from "@/lib/types";

type ProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
};

type PageCopy = {
  pageBadge: string;
  pageTitle: string;
  pageSubtitle: string;
};

export function createUnifiedDashboardPage(
  requiredRole: UserRole,
  copy: PageCopy | ((profile: ProfileRow) => PageCopy),
) {
  return async function UnifiedDashboardPage() {
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

    if (!profile || profile.role !== requiredRole) redirect("/dashboard");

    const row = profile as ProfileRow;
    const pageCopy = typeof copy === "function" ? copy(row) : copy;
    const data = await loadUnifiedManagementData(user.id, row.agent_id ?? "");

    return (
      <UnifiedManagementDashboard
        data={data}
        viewerId={user.id}
        defaultTestRole={mapUserRoleToTestRole(row.role)}
        pageBadge={pageCopy.pageBadge}
        pageTitle={pageCopy.pageTitle}
        pageSubtitle={pageCopy.pageSubtitle}
      />
    );
  };
}
