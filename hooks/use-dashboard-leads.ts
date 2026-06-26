"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeadDetail } from "@/lib/lead-detail";
import { createClient } from "@/lib/supabase/client";
import {
  leadMatchesAssignedFilter,
  mergeLeadFromRealtime,
  realtimeRowToLeadDetail,
  type RealtimeLeadRow,
} from "@/lib/realtime-lead-merge";

export interface UseDashboardLeadsOptions {
  /** SSR 초기값 */
  initialLeads?: LeadDetail[];
  /** 노무사 배당 건만 조회 */
  assignedTo?: string;
  /** 유입 라인·파트너명 enrichment */
  enrich?: boolean;
  /** Supabase Realtime 구독 (기본 true) */
  realtime?: boolean;
  /** false면 SSR/부모에서 넘긴 leads만 사용 (직책 테스트 스코프용) */
  clientRefetch?: boolean;
}

export function useDashboardLeads(options: UseDashboardLeadsOptions = {}) {
  const {
    initialLeads = [],
    assignedTo,
    enrich = false,
    realtime = true,
    clientRefetch = true,
  } = options;

  const initialRef = useRef(initialLeads);
  initialRef.current = initialLeads;

  const [customers, setCustomers] = useState<LeadDetail[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(initialLeads.length === 0);
  const [error, setError] = useState<string | null>(null);

  const enrichTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCustomersRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(
    async () => {},
  );

  const fetchCustomers = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (enrich) params.set("enrich", "1");
      if (assignedTo) params.set("assignedTo", assignedTo);

      const res = await fetch(`/api/dashboard/leads?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });

      const json = (await res.json()) as {
        data?: LeadDetail[];
        error?: string;
        count?: number;
      };

      if (!res.ok || json.error) {
        const msg = json.error ?? `HTTP ${res.status}`;
        console.error("[useDashboardLeads]", msg);
        setError(msg);
        if (initialRef.current.length > 0) {
          setCustomers(initialRef.current);
        }
        return;
      }

      const data = json.data ?? [];
      setCustomers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useDashboardLeads] 예외:", err);
      setError(msg);
      if (initialRef.current.length > 0) {
        setCustomers(initialRef.current);
      }
    } finally {
      if (!opts?.silent) {
        setIsLoading(false);
      }
    }
  }, [assignedTo, enrich]);

  fetchCustomersRef.current = fetchCustomers;

  const scheduleSilentEnrichRefetch = useCallback(() => {
    if (!enrich) return;
    if (enrichTimerRef.current) clearTimeout(enrichTimerRef.current);
    enrichTimerRef.current = setTimeout(() => {
      void fetchCustomersRef.current({ silent: true });
    }, 350);
  }, [enrich]);

  useEffect(() => {
    if (initialLeads.length > 0) {
      setCustomers(initialLeads);
      setIsLoading(false);
    }
  }, [initialLeads]);

  useEffect(() => {
    if (!clientRefetch) return;
    void fetchCustomers();
  }, [fetchCustomers, clientRefetch]);

  useEffect(() => {
    if (!realtime) return;

    const supabase = createClient();
    const channelName = assignedTo
      ? `realtime-leads:${assignedTo}`
      : "realtime-leads";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT" && payload.new) {
            const lead = realtimeRowToLeadDetail(payload.new as RealtimeLeadRow);
            if (!lead.id || !leadMatchesAssignedFilter(lead, assignedTo)) return;

            setCustomers((prev) => {
              if (prev.some((l) => l.id === lead.id)) return prev;
              return [lead, ...prev];
            });
            scheduleSilentEnrichRefetch();
            return;
          }

          if (eventType === "UPDATE" && payload.new) {
            const row = payload.new as RealtimeLeadRow;
            const id = row.id != null ? String(row.id) : "";
            if (!id) return;

            const updatedLead = realtimeRowToLeadDetail(row);
            if (!leadMatchesAssignedFilter(updatedLead, assignedTo)) {
              setCustomers((prev) => prev.filter((l) => l.id !== id));
              return;
            }

            setCustomers((prev) => {
              const exists = prev.some((l) => l.id === id);
              if (!exists) {
                return [updatedLead, ...prev];
              }
              return prev.map((l) =>
                l.id === id ? mergeLeadFromRealtime(l, row) : l,
              );
            });
            return;
          }

          if (eventType === "DELETE" && payload.old) {
            const old = payload.old as RealtimeLeadRow;
            const id = old.id != null ? String(old.id) : "";
            if (!id) return;
            setCustomers((prev) => prev.filter((l) => l.id !== id));
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.debug("[useDashboardLeads] Realtime 구독 시작:", channelName);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[useDashboardLeads] Realtime 구독 오류:", status, err);
        }
      });

    return () => {
      if (enrichTimerRef.current) {
        clearTimeout(enrichTimerRef.current);
        enrichTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [assignedTo, realtime, scheduleSilentEnrichRefetch]);

  return {
    customers,
    setCustomers,
    isLoading,
    error,
    refetch: fetchCustomers,
  };
}
