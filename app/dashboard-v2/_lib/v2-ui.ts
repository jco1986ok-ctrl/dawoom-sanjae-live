import { cn } from "@/lib/utils";

/** V2 테스트보드 — 페이지 바탕 */
export const V2_PAGE_BG = "bg-slate-50";

/** 데이터 카드 공통 표면 */
export const V2_SURFACE_CARD =
  "bg-white rounded-xl shadow-sm border border-gray-100";

export function v2SurfaceCard(className?: string) {
  return cn(V2_SURFACE_CARD, className);
}
