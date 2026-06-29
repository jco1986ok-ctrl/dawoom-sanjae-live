"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isInAppBrowser } from "@/components/pwa/in-app-browser";
import { pwaAssetUrl } from "@/lib/pwa-asset-version";
import {
  ANDROID_FALLBACK_ALERT,
  DESKTOP_FALLBACK_ALERT,
  detectPlatform,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
  type DevicePlatform,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [platform, setPlatform] = useState<DevicePlatform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
    setIsStandalone(isStandaloneDisplay());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(pwaAssetUrl("/sw.js")).catch(() => {
        /* ignore */
      });
    }

    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = () => setIsStandalone(isStandaloneDisplay());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as BeforeInstallPromptEvent;
      setInstallReady(true);
    };

    standaloneMq.addEventListener("change", onStandaloneChange);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      standaloneMq.removeEventListener("change", onStandaloneChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const canShowInstall = mounted && !isStandalone && !isInAppBrowser();

  const runNativePrompt = useCallback(async (fallbackAlert: string) => {
    const promptEvent = installPromptRef.current;
    if (!promptEvent) {
      window.alert(fallbackAlert);
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      installPromptRef.current = null;
      setInstallReady(false);
    } catch {
      window.alert(fallbackAlert);
    } finally {
      setInstalling(false);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (installing) return;

    if (platform === "ios") {
      setIosModalOpen(true);
      return;
    }

    if (platform === "android") {
      await runNativePrompt(ANDROID_FALLBACK_ALERT);
      return;
    }

    await runNativePrompt(DESKTOP_FALLBACK_ALERT);
  }, [installing, platform, runNativePrompt]);

  return {
    platform,
    installReady,
    installing,
    iosModalOpen,
    setIosModalOpen,
    canShowInstall,
    handleInstall,
  };
}
