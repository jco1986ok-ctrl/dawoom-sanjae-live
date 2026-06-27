"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { V2_MY_BOARD_ROUTE } from "@/lib/v2-my-board-route";
import { cn } from "@/lib/utils";

type Variant = "tab" | "hero" | "bar";

export default function V2MyBoardNavLink({
  variant = "tab",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith(V2_MY_BOARD_ROUTE);

  if (variant === "hero") {
    return (
      <Link
        href={V2_MY_BOARD_ROUTE}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold",
          "bg-white text-[#0f2d5e] shadow-md hover:bg-blue-50 transition-colors whitespace-nowrap",
          active && "ring-2 ring-cyan-300",
          className,
        )}
      >
        <ClipboardList className="w-4 h-4 shrink-0" />
        내 업무 보드
      </Link>
    );
  }

  if (variant === "bar") {
    return (
      <Link
        href={V2_MY_BOARD_ROUTE}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg",
          "bg-[#0f2d5e] text-white border border-[#0a2248] hover:bg-[#0a2248] transition-colors min-h-10 whitespace-nowrap",
          active && "ring-2 ring-cyan-300",
          className,
        )}
      >
        <ClipboardList className="w-4 h-4 shrink-0" />
        내 업무 보드 열기
      </Link>
    );
  }

  return (
    <Link
      href={V2_MY_BOARD_ROUTE}
      className={cn(
        "shrink-0 min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-colors whitespace-nowrap",
        active
          ? "bg-[#0f2d5e] text-white shadow-sm"
          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-2 border-[#0f2d5e]/30 bg-sky-50/50",
        className,
      )}
    >
      <ClipboardList className="w-4 h-4 shrink-0" />
      내 업무 보드
    </Link>
  );
}
