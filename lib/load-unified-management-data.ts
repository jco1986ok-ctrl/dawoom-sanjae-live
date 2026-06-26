import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { enrichUsersWithLineage } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import { fetchDashboardLeads } from "@/lib/fetch-dashboard-leads";
import { enrichLeads } from "@/lib/enrich-leads";
import { fetchUsersForLeadLineage } from "@/lib/dashboard-users";
import {
  loadPartnerNetworkDashboard,
  type OfficialPartnerStatRow,
} from "@/lib/partner-network-dashboard";
import type { OfficialPartnerRow } from "@/app/dashboard/_components/PartnerAccordionTable";
import type { ReferralTreeForest, ReferralTreeNode } from "@/lib/build-referral-tree";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ParentPartnerOption } from "@/lib/partner-lineage";

import { OVERVIEW_STATUS_META } from "@/lib/lead-status";

const STATUS_META = OVERVIEW_STATUS_META;

export type UnifiedManagementData = {
  leads: LeadDetail[];
  enrichedUsers: AdminUserListItem[];
  attorneys: { id: string; name: string }[];
  partnerAccordionRows: OfficialPartnerRow[];
  referralTreeRoots: ReferralTreeNode[];
  referralTreeForest: ReferralTreeForest;
  officialPartnerStats: OfficialPartnerStatRow[];
  totalLeads: number;
  doneLeads: number;
  totalUsers: number;
  totalMemberCount: number;
  conversionRate: number;
  newThisMonth: number;
  statusCount: Record<string, number>;
  statusMeta: typeof STATUS_META;
  adminAgentId: string;
  parentPartnerOptions: ParentPartnerOption[];
};

async function loadAllLeadsForManagement(): Promise<LeadDetail[]> {
  try {
    const adminClient = createAdminClient();
    const result = await fetchDashboardLeads(adminClient, {
      admin: true,
      withPartner: true,
      limit: 500,
    });
    if (result.data.length > 0) return result.data;
    if (result.error) {
      console.error("[loadUnifiedManagementData] admin leads 조회 실패:", result.error);
    }
  } catch (adminErr) {
    console.warn(
      "[loadUnifiedManagementData] admin client 사용 불가, 세션 클라이언트로 폴백:",
      adminErr,
    );
  }

  const sessionClient = await createClient();
  const fallback = await fetchDashboardLeads(sessionClient, {
    withPartner: true,
    limit: 500,
  });
  if (fallback.error) {
    console.error("[loadUnifiedManagementData] session leads 조회 실패:", fallback.error);
  }
  return fallback.data;
}

export async function loadUnifiedManagementData(
  _viewerId: string,
  adminAgentId: string,
): Promise<UnifiedManagementData> {
  const adminClient = createAdminClient();

  const [rawLeads, { data: users = [] }, partnerNetwork, lineageUsers] = await Promise.all([
    loadAllLeadsForManagement(),
    adminClient
      .from("users")
      .select("id, name, role, agent_id, is_active, parent_agent_id")
      .order("created_at", { ascending: false }),
    loadPartnerNetworkDashboard(adminClient),
    fetchUsersForLeadLineage(),
  ]);

  const userMap: Record<string, { name: string; parent_agent_id: string | null; role: string }> =
    {};
  (users ?? []).forEach((u) => {
    if (u.id) {
      userMap[u.id as string] = {
        name: u.name as string,
        parent_agent_id: u.parent_agent_id as string | null,
        role: u.role as string,
      };
    }
  });

  const enrichedUsers = enrichUsersWithLineage(
    (users ?? []).map((u) => ({
      id: u.id as string,
      name: u.name as string,
      role: u.role as UserRole,
      agent_id: u.agent_id as string,
      is_active: u.is_active as boolean,
      parent_agent_id: u.parent_agent_id as string | null,
    })),
  );

  const attorneys = (users ?? [])
    .filter((u) => u.role === "노무사" && u.is_active)
    .map((u) => ({ id: u.id as string, name: u.name as string }));

  const leads = enrichLeads(rawLeads, lineageUsers, (l) => {
    const assignedId = l.assigned_to as string | null;
    const assignedInfo = assignedId ? userMap[assignedId] : null;
    return {
      assigned_to: assignedId,
      assigned_attorney_name: assignedInfo?.name ?? null,
    };
  });

  const totalLeads = leads.length;
  const doneLeads = leads.filter((l) => l.consultation_status === "계약완료").length;
  const totalUsers = (users ?? []).length;
  const conversionRate = totalLeads > 0 ? Math.round((doneLeads / totalLeads) * 100) : 0;
  const newThisMonth = leads.filter((l) => {
    const created = new Date(l.created_at);
    const now = new Date();
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  const statusCount = STATUS_META.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = leads.filter((l) => l.consultation_status === s.key).length;
    return acc;
  }, {});

  const parentPartnerOptions: ParentPartnerOption[] = (users ?? [])
    .filter((u) => u.role === "총판영업자" || u.role === "총괄공식파트너")
    .map((u) => ({
      id: u.id as string,
      name: u.name as string,
      role: u.role as ParentPartnerOption["role"],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return {
    leads,
    enrichedUsers,
    attorneys,
    partnerAccordionRows: partnerNetwork.partnerAccordionRows,
    referralTreeRoots: partnerNetwork.referralTreeRoots,
    referralTreeForest: partnerNetwork.referralTreeForest,
    officialPartnerStats: partnerNetwork.officialPartnerStats,
    totalLeads,
    doneLeads,
    totalUsers,
    totalMemberCount: partnerNetwork.totalMemberCount,
    conversionRate,
    newThisMonth,
    statusCount,
    statusMeta: STATUS_META,
    adminAgentId,
    parentPartnerOptions,
  };
}
