import { redirect } from "next/navigation";

/** 레거시 경로 → 담당 노무사 대시보드 */
export default function AttorneyDashboardPage() {
  redirect("/dashboard/general-attorney");
}
