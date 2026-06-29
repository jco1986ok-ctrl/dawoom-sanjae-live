import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadDetail } from "@/lib/lead-detail";
import {
  LEADS_LIST_SELECT_FALLBACKS,
  LEADS_LIST_SELECT_WITH_PARTNER_FALLBACKS,
  LEADS_LIST_SELECT_FALLBACKS_BASIC,
} from "@/lib/leads-query";

export type FetchDashboardLeadsOptions = {
  assignedTo?: string;
  limit?: number;
  admin?: boolean;
  withPartner?: boolean;
  statusIn?: string[];
  statusEq?: string;
  orderAscending?: boolean;
  /** 총괄파트너 네트워크 — referred_by 또는 master_agent_id 매칭 */
  networkUserIds?: string[];
};

/** Supabase/PostgREST 컬럼·스키마 오류 */
const COLUMN_MISSING =
  /pdf_url|docs_status|has_weim|other_docs|referrer|assigned_to|disease_category|fee_amount|current_owner_role|assigned_user_id|assignment_memo|is_read|callback_date|last_updated_at|master_agent_id|column|does not exist|schema cache|could not find/i;

function buildSelectVariants(options: FetchDashboardLeadsOptions): string[] {
  const variants: string[] = [];

  if (options.admin) {
    variants.push(...LEADS_LIST_SELECT_FALLBACKS);
  }
  if (options.withPartner !== false) {
    variants.push(...LEADS_LIST_SELECT_WITH_PARTNER_FALLBACKS);
  }
  variants.push(...LEADS_LIST_SELECT_FALLBACKS_BASIC);

  return [...new Set(variants)];
}

function selectHasAssignedTo(select: string): boolean {
  return select.includes("assigned_to");
}

/**
 * leads 테이블 조회 — 마이그레이션 누락 컬럼(pdf_url, assigned_to 등)에도 단계적 폴백.
 */
export async function fetchDashboardLeads(
  client: SupabaseClient,
  options: FetchDashboardLeadsOptions = {},
): Promise<{ data: LeadDetail[]; error: string | null }> {
  const limit = options.limit ?? 500;
  const selects = buildSelectVariants(options);
  let lastError: string | null = null;

  for (const select of selects) {
    let query = client
      .from("leads")
      .select(select)
      .order("created_at", { ascending: options.orderAscending ?? false })
      .limit(limit);

    if (options.assignedTo && selectHasAssignedTo(select)) {
      query = query.eq("assigned_to", options.assignedTo);
    }
    if (options.networkUserIds?.length) {
      const ids = options.networkUserIds;
      query = query.or(
        `referred_by_user_id.in.(${ids.join(",")}),master_agent_id.in.(${ids.join(",")})`,
      );
    }
    if (options.statusIn?.length) {
      query = query.in("consultation_status", options.statusIn);
    }
    if (options.statusEq) {
      query = query.eq("consultation_status", options.statusEq);
    }

    const { data, error } = await query;

    if (!error) {
      return { data: (data ?? []) as LeadDetail[], error: null };
    }

    lastError = error.message ?? String(error);

    if (COLUMN_MISSING.test(lastError)) {
      console.warn("[fetchDashboardLeads] SELECT 폴백:", select, "→", lastError);
      continue;
    }

    console.error("[fetchDashboardLeads] leads 조회 실패:", error);
    return { data: [], error: lastError };
  }

  console.error("[fetchDashboardLeads] 모든 SELECT 변형 실패:", lastError);
  return { data: [], error: lastError ?? "leads 데이터를 불러오지 못했습니다." };
}
