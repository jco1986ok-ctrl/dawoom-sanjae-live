"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TowerControl } from "lucide-react";

const HIDE_DELAY_MS = 1200;
const FADE_OUT_MS = 300;
const TEXT_DELAY_MS = 100;

export default function SplashScreen() {
  const pathname = usePathname();
  const isSignPage = pathname.startsWith("/sign/");
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(!isSignPage);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isSignPage) {
      setShouldRender(false);
      return;
    }

    const textTimer = window.setTimeout(() => setShowContent(true), TEXT_DELAY_MS);
    const hideTimer = window.setTimeout(() => setIsVisible(false), HIDE_DELAY_MS);
    const removeTimer = window.setTimeout(
      () => setShouldRender(false),
      HIDE_DELAY_MS + FADE_OUT_MS,
    );

    return () => {
      window.clearTimeout(textTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [isSignPage]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white
        transition-opacity duration-300
        ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!isVisible}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={
          showContent && isVisible
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 10 }
        }
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center justify-center px-6 text-center"
      >
        <TowerControl
          size={48}
          strokeWidth={1.75}
          className="text-blue-600 mb-4"
          aria-hidden
        />
        <p className="text-xl font-bold text-gray-900 tracking-tight">
          질병산재 전문 노무법인 파로스
        </p>
      </motion.div>
    </div>
  );
}
