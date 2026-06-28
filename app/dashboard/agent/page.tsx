import { createUnifiedDashboardPage } from "../_lib/create-unified-dashboard-page";

export default createUnifiedDashboardPage("하위영업자", (profile) => ({
  pageBadge: "제휴 멤버 대시보드",
  pageTitle: `안녕하세요, ${profile.name} 님 👋`,
  pageSubtitle: `내 코드: ${profile.agent_id} · 유입 고객 DB를 관리합니다.`,
}));
