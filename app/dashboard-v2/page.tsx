import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDashboardV2MasterRole } from "@/lib/dashboard-v2-access";
import { mapUserRoleToTestRole } from "@/lib/dashboard-rbac";
import { loadUnifiedManagementData } from "@/lib/load-unified-management-data";
import V2UnifiedManagementDashboard from "./_components/V2UnifiedManagementDashboard";

/**
 * V2 샌드박스 — /dashboard/admin 과 동일한 고객 관리 UI (복사본 진입점).
 * 신규 기능(3인 협업·알림 등)은 app/dashboard-v2/ 아래에서만 추가합니다.
 */
export default async function DashboardV2Page() {
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

  if (!profile || !isDashboardV2MasterRole(profile.role as string)) {
    redirect("/dashboard");
  }

  const data = await loadUnifiedManagementData(user.id, profile.agent_id as string);

  return (
    <V2UnifiedManagementDashboard
      data={data}
      viewerId={user.id}
      defaultTestRole={mapUserRoleToTestRole(profile.role)}
      pageBadge="🧪 V2 테스트 보드"
      pageTitle="노무법인 파로스 관리 현황 (V2)"
      pageSubtitle="샌드박스 — 라이브 대시보드와 분리된 마스터 전용 테스트 환경입니다."
    />
  );
}
