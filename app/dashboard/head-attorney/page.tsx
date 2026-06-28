import { createUnifiedDashboardPage } from "../_lib/create-unified-dashboard-page";

export default createUnifiedDashboardPage("대표노무사", (profile) => ({
  pageBadge: "대표 노무사 대시보드",
  pageTitle: `안녕하세요, ${profile.name} 노무사님 👋`,
  pageSubtitle: "전체 사건 현황 · 상담 DB를 관리합니다.",
}));
