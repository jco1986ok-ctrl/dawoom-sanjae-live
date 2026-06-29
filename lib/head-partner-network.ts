import { collectPartnerSubtreeIds } from "@/lib/build-organization-tree";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const PARTNER_ROLES: UserRole[] = ["총판영업자", "하위영업자", "총괄공식파트너"];

/** 총괄파트너 하위 네트워크 전체 ID (parent_agent_id 재귀) */
export async function fetchHeadPartnerNetworkUserIds(
  headPartnerId: string,
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data = [], error } = await admin
    .from("users")
    .select("id, role, parent_agent_id")
    .in("role", PARTNER_ROLES);

  if (error) {
    console.error("[head-partner-network] partner users 조회 실패:", error);
    return new Set([headPartnerId]);
  }

  return collectPartnerSubtreeIds(
    headPartnerId,
    (data ?? []).map((u) => ({
      id: u.id as string,
      role: u.role as string,
      parent_agent_id: u.parent_agent_id as string | null,
    })),
  );
}

export async function fetchHeadPartnerNetworkUserRows<
  T extends Record<string, unknown>,
>(headPartnerId: string, select: string): Promise<T[]> {
  const networkIds = await fetchHeadPartnerNetworkUserIds(headPartnerId);
  const admin = createAdminClient();

  const { data: partnerRows = [], error: partnerError } = await admin
    .from("users")
    .select(select)
    .in("id", Array.from(networkIds))
    .order("created_at", { ascending: false });

  if (partnerError) {
    console.error("[head-partner-network] network users 조회 실패:", partnerError);
    return [];
  }

  const { data: attorneyRows = [] } = await admin
    .from("users")
    .select(select)
    .eq("role", "노무사")
    .in("parent_agent_id", Array.from(networkIds));

  const byId = new Map<string, T>();
  for (const row of [...(partnerRows ?? []), ...(attorneyRows ?? [])]) {
    const id = row.id as string;
    if (id) byId.set(id, row as T);
  }

  return [...byId.values()];
}
