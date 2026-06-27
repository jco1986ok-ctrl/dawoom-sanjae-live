import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadDetail } from "@/lib/lead-detail";
import { LEADS_LIST_SELECT_FALLBACKS_BASIC, LEADS_LIST_SELECT_CORE } from "@/lib/leads-query";

const COLUMN_MISSING =
  /assigned_user_id|column|does not exist|schema cache|could not find/i;

/** 로그인 사용자에게 배정된(assigned_user_id) 사건만 조회 */
export async function fetchMyBoardLeads(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: LeadDetail[]; error: string | null }> {
  const selects = [LEADS_LIST_SELECT_FALLBACKS_BASIC[0], LEADS_LIST_SELECT_CORE];
  let lastError: string | null = null;

  for (const select of [...new Set(selects)]) {
    const { data, error } = await client
      .from("leads")
      .select(select)
      .eq("assigned_user_id", userId)
      .order("last_updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) {
      return { data: (data ?? []) as LeadDetail[], error: null };
    }

    lastError = error.message ?? String(error);
    if (COLUMN_MISSING.test(lastError)) continue;
    return { data: [], error: lastError };
  }

  return { data: [], error: lastError ?? "내 업무 목록을 불러오지 못했습니다." };
}
