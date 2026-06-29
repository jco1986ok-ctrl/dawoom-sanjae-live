"use client";

import { Download, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import PwaInstallIosDialog from "./PwaInstallIosDialog";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** 헤더용 컴팩트 / 파란 히어로용 pill */
  variant?: "header" | "pill" | "hero";
}

export default function PwaInstallButton({ className, variant = "header" }: Props) {
  const {
    platform,
    installing,
    iosModalOpen,
    setIosModalOpen,
    canShowInstall,
    handleInstall,
  } = usePwaInstall();

  if (!canShowInstall) return null;

  const isMobile = platform === "android" || platform === "ios";
  const label = installing ? "설치 중…" : "앱 설치";

  if (variant === "hero") {
    return (
      <>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold",
            "bg-white/15 text-white border border-white/25 backdrop-blur-sm",
            "hover:bg-white/25 transition-colors whitespace-nowrap",
            installing && "opacity-70 cursor-wait",
            className,
          )}
          aria-label="파로스 앱 설치"
        >
          {isMobile ? (
            <Smartphone className="w-4 h-4 shrink-0" />
          ) : (
            <Download className="w-4 h-4 shrink-0" />
          )}
          {label}
        </button>
        <PwaInstallIosDialog open={iosModalOpen} onOpenChange={setIosModalOpen} />
      </>
    );
  }

  if (variant === "pill") {
    return (
      <>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#0f2d5e]/20",
            "bg-[#0f2d5e]/5 text-[#0f2d5e] text-xs font-bold px-3 py-1.5",
            "hover:bg-[#0f2d5e]/10 transition-colors shrink-0",
            installing && "opacity-70 cursor-wait",
            className,
          )}
          aria-label="파로스 앱 설치"
        >
          {isMobile ? (
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{label}</span>
        </button>
        <PwaInstallIosDialog open={iosModalOpen} onOpenChange={setIosModalOpen} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200",
          "bg-white text-slate-700 text-xs font-semibold px-2.5 py-1.5 sm:px-3",
          "hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0",
          installing && "opacity-70 cursor-wait",
          className,
        )}
        title={isMobile ? "스마트폰 홈 화면에 파로스 앱 설치" : "바탕 화면에 파로스 앱 설치"}
        aria-label="파로스 앱 설치"
      >
        {isMobile ? (
          <Smartphone className="w-4 h-4 shrink-0 text-[#0f2d5e]" />
        ) : (
          <Download className="w-4 h-4 shrink-0 text-[#0f2d5e]" />
        )}
        <span className="hidden sm:inline">{label}</span>
      </button>
      <PwaInstallIosDialog open={iosModalOpen} onOpenChange={setIosModalOpen} />
    </>
  );
}
