import { redirect } from "next/navigation";
import { V2_MY_BOARD_ROUTE } from "@/lib/v2-my-board-route";

/** 레거시 경로 → V2 내 업무 보드 */
export default function MyBoardLegacyRedirect() {
  redirect(V2_MY_BOARD_ROUTE);
}
