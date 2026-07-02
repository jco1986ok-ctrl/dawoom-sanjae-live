import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDashboardLeads } from "@/lib/fetch-dashboard-leads";
import { fetchUsersForLeadLineage } from "@/lib/dashboard-users";
import {
  auditLeadsPartnerAttribution,
  summarizePartnerAudit,
} from "@/lib/lead-partner-audit";
import type { UserRole } from "@/lib/types";

const AUDIT_ACCESS_ROLES = new Set<UserRole>(["관리자", "대표노무사", "총괄공식파트너"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role || !AUDIT_ACCESS_ROLES.has(profile.role as UserRole)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onlyNeedsReview = searchParams.get("needsReview") === "1";
  const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? "90") || 90));

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  try {
    const admin = createAdminClient();
    const { data: leads, error } = await fetchDashboardLeads(admin, {
      admin: true,
      withPartner: true,
      limit: 2000,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const recentLeads = leads.filter((l) => l.created_at >= sinceIso);
    const relatedUserIds = recentLeads.flatMap((l) =>
      [l.referred_by_user_id, l.master_agent_id].filter((id): id is string => Boolean(id)),
    );

    const users = await fetchUsersForLeadLineage(
      profile.id as string,
      profile.role as UserRole,
      relatedUserIds,
    );

    let rows = auditLeadsPartnerAttribution(recentLeads, users);
    if (onlyNeedsReview) {
      rows = rows.filter((r) => r.needsReview);
    }

    return NextResponse.json({
      rows,
      summary: summarizePartnerAudit(rows),
      meta: { days, since: sinceIso, onlyNeedsReview },
    });
  } catch (err) {
    console.error("[partner-attribution-audit]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "조회 실패" },
      { status: 500 },
    );
  }
}
