import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDashboardLeads } from "@/lib/fetch-dashboard-leads";
import { enrichLeads } from "@/lib/enrich-leads";
import { fetchUsersForLeadLineage } from "@/lib/dashboard-users";
import type { UserRole } from "@/lib/types";

/** Service Role로 전체 leads 조회 가능한 역할 */
const ORG_WIDE_ACCESS_ROLES = new Set<UserRole>(["관리자", "대표노무사", "총괄공식파트너"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", data: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다.", data: [] }, { status: 403 });
  }

  const role = profile.role as UserRole;
  const { searchParams } = new URL(request.url);
  const wantEnrich = searchParams.get("enrich") === "1";
  const assignedParam = searchParams.get("assignedTo");

  try {
    let result: Awaited<ReturnType<typeof fetchDashboardLeads>>;

    if (ORG_WIDE_ACCESS_ROLES.has(role)) {
      const admin = createAdminClient();
      result = await fetchDashboardLeads(admin, {
        admin: true,
        withPartner: true,
        withAssigneeJoin: true,
        assignedTo: assignedParam ?? undefined,
        limit: 500,
      });
    } else if (role === "노무사") {
      const admin = createAdminClient();
      result = await fetchDashboardLeads(admin, {
        admin: true,
        withPartner: true,
        assignedTo: assignedParam ?? (profile.id as string),
        limit: 500,
      });
    } else {
      result = await fetchDashboardLeads(supabase, {
        withPartner: true,
        limit: 500,
      });
    }

    if (result.error) {
      console.error("[api/dashboard/leads]", result.error, { role, userId: user.id });
      return NextResponse.json({ error: result.error, data: [] }, { status: 500 });
    }

    let leads = result.data;

    if (wantEnrich && leads.length > 0) {
      try {
        const relatedUserIds = leads.flatMap((l) =>
          [l.referred_by_user_id, l.master_agent_id, l.assigned_to, l.assigned_user_id].filter(
            (id): id is string => Boolean(id),
          ),
        );
        const users = await fetchUsersForLeadLineage(
          profile.id as string,
          role,
          [...new Set(relatedUserIds)],
        );
        leads = enrichLeads(leads, users);
      } catch (enrichErr) {
        console.warn("[api/dashboard/leads] enrich 실패:", enrichErr);
      }
    }

    return NextResponse.json({ data: leads, count: leads.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/dashboard/leads] 예외:", err);
    return NextResponse.json({ error: msg, data: [] }, { status: 500 });
  }
}
