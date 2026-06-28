import { createUnifiedDashboardPage } from "../_lib/create-unified-dashboard-page";

export default createUnifiedDashboardPage("노무사", (profile) => ({
  pageBadge: "담당 노무사 대시보드",
  pageTitle: `안녕하세요, ${profile.name} 노무사님 👋`,
  pageSubtitle: "배당된 사건 · 3인 협업 보드 · 상담 DB를 관리합니다.",
}));
