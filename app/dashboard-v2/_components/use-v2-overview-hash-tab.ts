"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildV2OverviewHash,
  parseV2OverviewHashTab,
  type V2OverviewTabId,
} from "@/lib/v2-overview-tabs";

export function useV2OverviewHashTab() {
  const [activeTab, setActiveTab] = useState<V2OverviewTabId>("summary");

  useEffect(() => {
    const syncFromHash = () => {
      setActiveTab(parseV2OverviewHashTab(window.location.hash));
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const setHashTab = useCallback((tab: V2OverviewTabId) => {
    const nextHash = buildV2OverviewHash(tab);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash.slice(1);
    }
    setActiveTab(tab);
  }, []);

  return { activeTab, setHashTab };
}
