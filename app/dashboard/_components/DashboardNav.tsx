"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import type { AppUser } from "@/lib/types";
import ChangePasswordModal from "./ChangePasswordModal";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";
import DashboardBoardSwitch, { DashboardBoardSwitchCompact } from "./DashboardBoardSwitch";
import { LIVE_MY_BOARD_ROUTE } from "@/lib/live-my-board-route";

const ROLE_LABEL: Record<string, string> = {
  총괄공식파트너: "총괄 파트너",
  총판영업자:     "공식 파트너",
  하위영업자:     "제휴 멤버",
  관리자:         "관리자",
  노무사:         "노무사",
  대표노무사:     "대표 노무사",
};

const ROLE_COLOR: Record<string, string> = {
  총괄공식파트너: "bg-violet-100 text-violet-700",
  총판영업자:     "bg-orange-100 text-orange-700",
  하위영업자:     "bg-blue-100 text-blue-700",
  관리자:         "bg-red-100 text-red-700",
  노무사:         "bg-cyan-100 text-cyan-700",
  대표노무사:     "bg-teal-100 text-teal-700",
};

export default function DashboardNav({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const onMyBoard = pathname?.startsWith(LIVE_MY_BOARD_ROUTE);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-x-3 min-w-0">
          <div className="bg-transparent shrink-0">
            <ParoLogo size={52} priority className="w-12 h-12 sm:w-14 sm:h-14 bg-transparent" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-black text-foreground text-sm sm:text-base block leading-tight">
              파로스 관리시스템
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground block truncate">
              {PARO_GREETING}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={LIVE_MY_BOARD_ROUTE}
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors shrink-0
              ${onMyBoard
                ? "bg-[#0f2d5e] text-white border-[#0f2d5e]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
          >
            📋 내 업무 보드
          </Link>
          <DashboardBoardSwitchCompact userRole={user.role} />
          <DashboardBoardSwitch userRole={user.role} />
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm font-medium text-foreground hidden md:inline">{user.name}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[user.role] ?? "bg-gray-100 text-gray-700"}`}
            >
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
          <ChangePasswordModal />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
