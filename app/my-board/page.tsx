import { redirect } from "next/navigation";
import { LIVE_MY_BOARD_ROUTE } from "@/lib/live-my-board-route";

/** 레거시 경로 → 라이브 내 업무 보드 */
export default function MyBoardLegacyRedirect() {
  redirect(LIVE_MY_BOARD_ROUTE);
}
