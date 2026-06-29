import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  hasOrgWideDashboardAccess,
  isHeadPartnerRole,
  isPartnerScopedRole,
} from "@/lib/dashboard-data-scope";
import { fetchHeadPartnerNetworkUserRows } from "@/lib/head-partner-network";
import type { LineageUserRow } from "@/lib/lead-lineage";
import type { UserRole } from "@/lib/types";

const LINEAGE_SELECT = "id, name, role, agent_id, parent_agent_id";

function mapLineageRows(
  data: Array<Record<string, unknown>> | null | undefined,
): LineageUserRow[] {
  return (data ?? []).map((u) => ({
    id: u.id as string,
    name: u.name as string,
    role: u.role as UserRole,
    agent_id: u.agent_id as string,
    parent_agent_id: u.parent_agent_id as string | null,
  }));
}

async function fetchLineageUsersByIds(ids: string[]): Promise<LineageUserRow[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data = [] } = await admin
    .from("users")
    .select(LINEAGE_SELECT)
    .in("id", ids)
    .eq("is_active", true);
  return mapLineageRows(data);
}

/** 유입 라인 표시용 users — 직책에 맞게 범위 제한 (서버 전용) */
export async function fetchUsersForLeadLineage(
  viewerId: string,
  role: UserRole,
  relatedUserIds: string[] = [],
): Promise<LineageUserRow[]> {
  if (hasOrgWideDashboardAccess(role)) {
    const admin = createAdminClient();
    const { data = [] } = await admin
      .from("users")
      .select(LINEAGE_SELECT)
      .eq("is_active", true);
    return mapLineageRows(data);
  }

  if (role === "노무사") {
    return fetchLineageUsersByIds(relatedUserIds);
  }

  if (isHeadPartnerRole(role)) {
    const rows = await fetchHeadPartnerNetworkUserRows<Record<string, unknown>>(
      viewerId,
      LINEAGE_SELECT,
    );
    return mapLineageRows(rows);
  }

  if (isPartnerScopedRole(role)) {
    const session = await createClient();
    const { data = [] } = await session
      .from("users")
      .select(LINEAGE_SELECT)
      .eq("is_active", true);
    return mapLineageRows(data);
  }

  const session = await createClient();
  const { data = [] } = await session
    .from("users")
    .select(LINEAGE_SELECT)
    .eq("is_active", true);
  return mapLineageRows(data);
}
