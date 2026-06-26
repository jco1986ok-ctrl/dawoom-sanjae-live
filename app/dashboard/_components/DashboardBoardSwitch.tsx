"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, FlaskConical, LayoutDashboard } from "lucide-react";
import { isDashboardV2MasterRole } from "@/lib/dashboard-v2-access";

/** 마스터 전용 — 라이브 대시보드 ↔ V2 테스트 보드 전환 */
export default function DashboardBoardSwitch({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const onV2 = pathname?.startsWith("/dashboard-v2");

  if (!isDashboardV2MasterRole(userRole)) return null;

  if (onV2) {
    return (
      <Link
        href="/dashboard"
        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors
          bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shrink-0"
        title="라이브 대시보드로 이동"
      >
        <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">라이브 대시보드</span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard-v2"
      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors
        bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100 shrink-0"
      title="V2 테스트 보드로 이동"
    >
      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
      <span className="whitespace-nowrap">🧪 V2 테스트 보드</span>
    </Link>
  );
}

/** 모바일에서도 보이는 컴팩트 아이콘+짧은 라벨 (선택) */
export function DashboardBoardSwitchCompact({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const onV2 = pathname?.startsWith("/dashboard-v2");

  if (!isDashboardV2MasterRole(userRole)) return null;

  const href = onV2 ? "/dashboard" : "/dashboard-v2";
  const label = onV2 ? "라이브" : "V2";

  return (
    <Link
      href={href}
      className="sm:hidden inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full
        border border-slate-200 bg-slate-50 text-slate-700 shrink-0"
      aria-label={onV2 ? "라이브 대시보드" : "V2 테스트 보드"}
    >
      <ArrowLeftRight className="w-3 h-3" />
      {label}
    </Link>
  );
}
