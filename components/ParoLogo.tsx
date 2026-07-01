"use client";

import { motion } from "framer-motion";
import { TowerControl } from "lucide-react";
import { cn } from "@/lib/utils";

export type ParoLogoVariant = "header" | "dashboard" | "hero" | "default";

const VARIANT_PRESET: Record<
  ParoLogoVariant,
  { size: number; className: string; strokeWidth: number }
> = {
  header: { size: 16, className: "text-blue-600 shrink-0", strokeWidth: 2 },
  dashboard: { size: 28, className: "text-blue-700 shrink-0", strokeWidth: 2 },
  hero: {
    size: 64,
    className: "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]",
    strokeWidth: 1.5,
  },
  default: { size: 40, className: "text-blue-600 shrink-0", strokeWidth: 2 },
};

type ParoLogoProps = {
  size?: number;
  variant?: ParoLogoVariant;
  className?: string;
  animated?: boolean;
  strokeWidth?: number;
  /** @deprecated SVG 아이콘 전환 — 호환용, 무시됨 */
  priority?: boolean;
};

export default function ParoLogo({
  size,
  variant = "default",
  className = "",
  animated = false,
  strokeWidth,
}: ParoLogoProps) {
  const preset = VARIANT_PRESET[variant];
  const iconSize = size ?? preset.size;
  const shouldAnimate = animated || variant === "hero";

  const icon = (
    <TowerControl
      size={iconSize}
      strokeWidth={strokeWidth ?? preset.strokeWidth}
      className={cn(preset.className, className)}
      aria-hidden
    />
  );

  if (shouldAnimate) {
    return (
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
    );
  }

  return icon;
}

export const PARO_GREETING = "업무상 질병 산재, 파로스 등대가 함께합니다.";

export const PARO_BRAND_LINE = "질병산재 전문 노무법인 파로스";

type ParoBrandHeaderProps = {
  className?: string;
  textClassName?: string;
};

export function ParoBrandHeader({ className, textClassName }: ParoBrandHeaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      <ParoLogo variant="header" />
      <span
        className={cn(
          "text-[12px] font-semibold text-[#8B95A1] tracking-wider",
          textClassName,
        )}
      >
        {PARO_BRAND_LINE}
      </span>
    </div>
  );
}
