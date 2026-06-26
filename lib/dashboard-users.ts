import { createAdminClient } from "@/lib/supabase/admin";
import type { LineageUserRow } from "@/lib/lead-lineage";
import type { UserRole } from "@/lib/types";

/** 유입 라인 표시용 — RLS와 무관하게 users 맵 조회 (서버 전용) */
export async function fetchUsersForLeadLineage(): Promise<LineageUserRow[]> {
  const admin = createAdminClient();
  const { data = [] } = await admin
    .from("users")
    .select("id, name, role, agent_id, parent_agent_id")
    .eq("is_active", true);

  return (data ?? []).map((u) => ({
    id: u.id as string,
    name: u.name as string,
    role: u.role as UserRole,
    agent_id: u.agent_id as string,
    parent_agent_id: u.parent_agent_id as string | null,
  }));
}
