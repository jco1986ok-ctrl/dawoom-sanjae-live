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
  /** 파트너 스코프 등 — false면 realtime·재조회로 목록이 넓어지지 않음 */
  scopeFilter?: (lead: LeadDetail) => boolean;
}

export function useDashboardLeads(options: UseDashboardLeadsOptions = {}) {
  const {
    initialLeads = [],
    assignedTo,
    enrich = false,
    realtime = true,
    clientRefetch = true,
    scopeFilter,
  } = options;

  const scopeFilterRef = useRef(scopeFilter);
  scopeFilterRef.current = scopeFilter;

  const matchesScope = useCallback((lead: LeadDetail) => {
    const fn = scopeFilterRef.current;
    return fn ? fn(lead) : true;
  }, []);

  const initialRef = useRef(initialLeads);
  initialRef.current = initialLeads;

  const [customers, setCustomers] = useState<LeadDetail[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(
    clientRefetch && initialLeads.length === 0,
  );
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
      const fn = scopeFilterRef.current;
      const filtered = fn ? data.filter(fn) : data;

      // 파트너 SSR 스코프 데이터가 있는데 API가 빈 배열이면 덮어쓰지 않음
      if (filtered.length === 0 && initialRef.current.length > 0) {
        setCustomers(
          fn ? initialRef.current.filter(fn) : initialRef.current,
        );
        return;
      }

      setCustomers(filtered);
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
    if (!clientRefetch || !enrich) return;
    if (enrichTimerRef.current) clearTimeout(enrichTimerRef.current);
    enrichTimerRef.current = setTimeout(() => {
      void fetchCustomersRef.current({ silent: true });
    }, 350);
  }, [clientRefetch, enrich]);

  useEffect(() => {
    if (initialLeads.length > 0) {
      const fn = scopeFilterRef.current;
      setCustomers(fn ? initialLeads.filter(fn) : initialLeads);
      setIsLoading(false);
      return;
    }
    if (!clientRefetch) {
      setIsLoading(false);
    }
  }, [initialLeads, clientRefetch]);

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
            if (!matchesScope(lead)) return;
            if (!clientRefetch) return;

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
            const inScope =
              leadMatchesAssignedFilter(updatedLead, assignedTo) && matchesScope(updatedLead);

            if (!inScope) {
              setCustomers((prev) => prev.filter((l) => l.id !== id));
              return;
            }

            setCustomers((prev) => {
              const exists = prev.some((l) => l.id === id);
              if (!exists) {
                if (!clientRefetch) return prev;
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
  }, [assignedTo, clientRefetch, matchesScope, realtime, scheduleSilentEnrichRefetch]);

  return {
    customers,
    setCustomers,
    isLoading,
    error,
    refetch: fetchCustomers,
  };
}
