import type { LeadDetail } from "@/lib/lead-detail";
import { createAdminClient } from "@/lib/supabase/admin";

/** assigned_user_id는 있는데 조인 이름이 없을 때 users 테이블에서 보강 */
export async function hydrateAssigneeNames(leads: LeadDetail[]): Promise<LeadDetail[]> {
  const missingIds = [
    ...new Set(
      leads
        .filter((l) => l.assigned_user_id && !l.assigned_user_name)
        .map((l) => l.assigned_user_id as string),
    ),
  ];

  if (missingIds.length === 0) return leads;

  const admin = createAdminClient();
  const { data = [], error } = await admin
    .from("users")
    .select("id, name")
    .in("id", missingIds);

  if (error) {
    console.warn("[hydrateAssigneeNames] users 조회 실패:", error.message);
    return leads;
  }

  const nameById = new Map(
    (data ?? []).map((u) => [u.id as string, u.name as string]),
  );

  return leads.map((lead) => {
    if (!lead.assigned_user_id || lead.assigned_user_name) return lead;
    return {
      ...lead,
      assigned_user_name: nameById.get(lead.assigned_user_id) ?? null,
    };
  });
}
