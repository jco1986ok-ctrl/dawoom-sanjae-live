import type { SupabaseClient } from "@supabase/supabase-js";

export type ReferrerAgent = {
  id: string;
  role: string;
  parent_agent_id: string | null;
  agent_id: string;
  name: string;
};

const PARTNER_ROLES = ["하위영업자", "총판영업자", "총괄공식파트너", "관리자"] as const;

/** URL ?name= 값 정규화 (인코딩·공백) */
export function normalizePartnerName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(String(raw));
    const trimmed = decoded.trim().replace(/\s+/g, " ");
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    const trimmed = String(raw).trim().replace(/\s+/g, " ");
    return trimmed.length > 0 ? trimmed : null;
  }
}

export function resolveMasterAgentId(agent: ReferrerAgent): string | null {
  if (agent.role === "하위영업자" && agent.parent_agent_id) {
    return agent.parent_agent_id;
  }
  if (agent.role === "총판영업자" || agent.role === "총괄공식파트너") {
    return agent.id;
  }
  return null;
}

/** ?ref= (agent_id) 우선, 없으면 ?name= (파트너 실명)으로 영업자 조회 */
export async function resolveReferrerAgent(
  supabase: SupabaseClient,
  refCode?: string | null,
  partnerName?: string | null,
): Promise<ReferrerAgent | null> {
  const refCodeStr = refCode?.trim() || null;
  const normalizedName = normalizePartnerName(partnerName);

  if (refCodeStr) {
    const { data: byRef, error } = await supabase
      .from("users")
      .select("id, role, parent_agent_id, agent_id, name")
      .eq("agent_id", refCodeStr)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn("[referral] ref 조회 오류:", error.message);
    } else if (byRef) {
      return byRef as ReferrerAgent;
    }
  }

  if (!normalizedName) return null;

  const { data: byName, error: nameErr } = await supabase
    .from("users")
    .select("id, role, parent_agent_id, agent_id, name")
    .eq("is_active", true)
    .in("role", [...PARTNER_ROLES])
    .ilike("name", normalizedName);

  if (nameErr) {
    console.warn("[referral] name 조회 오류:", nameErr.message);
    return null;
  }

  let candidates = byName ?? [];

  // 띄어쓰기 차이(예: URL "나 윤정" vs DB "나윤정") 보정
  if (candidates.length === 0) {
    const compact = normalizedName.replace(/\s+/g, "");
    if (compact !== normalizedName) {
      const { data: allPartners } = await supabase
        .from("users")
        .select("id, role, parent_agent_id, agent_id, name")
        .eq("is_active", true)
        .in("role", [...PARTNER_ROLES]);

      candidates = (allPartners ?? []).filter((u) => {
        const n = normalizePartnerName(u.name as string);
        return n && n.replace(/\s+/g, "") === compact;
      });
    }
  }

  if (candidates.length === 0) {
    console.warn(`[referral] name="${normalizedName}" 에 해당하는 파트너 없음`);
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0] as ReferrerAgent;
  }

  const exact = candidates.filter(
    (u) => normalizePartnerName(u.name as string) === normalizedName,
  );
  if (exact.length === 1) {
    return exact[0] as ReferrerAgent;
  }

  console.warn(
    `[referral] name="${normalizedName}" 다중 매칭(${candidates.length}명) — ref 파라미터 사용 권장`,
  );
  return candidates[0] as ReferrerAgent;
}
