import { createUnifiedDashboardPage } from "../_lib/create-unified-dashboard-page";

export default createUnifiedDashboardPage("총괄공식파트너", (profile) => ({
  pageBadge: "총괄 파트너 대시보드",
  pageTitle: `안녕하세요, ${profile.name} 총괄님 👋`,
  pageSubtitle: "전체 파트너 네트워크 · 접수 DB 현황입니다.",
}));
