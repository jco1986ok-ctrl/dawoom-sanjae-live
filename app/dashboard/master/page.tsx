import { createUnifiedDashboardPage } from "../_lib/create-unified-dashboard-page";

export default createUnifiedDashboardPage("총판영업자", (profile) => ({
  pageBadge: "공식 파트너 대시보드",
  pageTitle: `안녕하세요, ${profile.name} 파트너님 👋`,
  pageSubtitle: "실시간 제휴 현황 · 고객 DB · 파트너 조직을 관리합니다.",
}));
