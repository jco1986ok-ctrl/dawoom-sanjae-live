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
import {
  getPartnerNetworkHeadId,
  hasOrgWideDashboardAccess,
  isHeadPartnerRole,
  isPartnerScopedRole,
} from "@/lib/dashboard-data-scope";
import { fetchHeadPartnerNetworkUserIds, fetchHeadPartnerNetworkUserRows } from "@/lib/head-partner-network";

import { OVERVIEW_STATUS_META } from "@/lib/lead-status";

const STATUS_META = OVERVIEW_STATUS_META;

const USER_SELECT =
  "id, name, role, agent_id, is_active, parent_agent_id";

type DbUserRow = {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
  is_active: boolean;
  parent_agent_id: string | null;
};

const EMPTY_PARTNER_NETWORK = {
  partnerAccordionRows: [] as OfficialPartnerRow[],
  referralTreeRoots: [] as ReferralTreeNode[],
  referralTreeForest: {
    masterTrackRoots: [],
    headPartnerTrackRoots: [],
  } as ReferralTreeForest,
  officialPartnerStats: [] as OfficialPartnerStatRow[],
  totalMemberCount: 0,
};

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

function collectLeadRelatedUserIds(leads: LeadDetail[]): string[] {
  const ids = new Set<string>();
  for (const lead of leads) {
    if (lead.referred_by_user_id) ids.add(lead.referred_by_user_id);
    if (lead.master_agent_id) ids.add(lead.master_agent_id);
    if (lead.assigned_to) ids.add(lead.assigned_to);
  }
  return [...ids];
}

function mapUserRows(
  rows: Array<Record<string, unknown>> | null | undefined,
): DbUserRow[] {
  return (rows ?? []).map((u) => ({
    id: u.id as string,
    name: u.name as string,
    role: u.role as UserRole,
    agent_id: u.agent_id as string,
    is_active: u.is_active as boolean,
    parent_agent_id: u.parent_agent_id as string | null,
  }));
}

async function loadLeadsForViewer(
  viewerId: string,
  role: UserRole,
): Promise<LeadDetail[]> {
  const limit = 500;

  if (hasOrgWideDashboardAccess(role)) {
    const adminClient = createAdminClient();
    const result = await fetchDashboardLeads(adminClient, {
      admin: true,
      withPartner: true,
      limit,
    });
    if (result.error) {
      console.error("[loadUnifiedManagementData] admin leads 조회 실패:", result.error);
    }
    return result.data;
  }

  if (role === "노무사") {
    const adminClient = createAdminClient();
    const result = await fetchDashboardLeads(adminClient, {
      admin: true,
      withPartner: true,
      assignedTo: viewerId,
      limit,
    });
    if (result.error) {
      console.error("[loadUnifiedManagementData] attorney leads 조회 실패:", result.error);
    }
    return result.data;
  }

  if (isHeadPartnerRole(role)) {
    const adminClient = createAdminClient();
    const networkUserIds = Array.from(await fetchHeadPartnerNetworkUserIds(viewerId));
    const result = await fetchDashboardLeads(adminClient, {
      admin: true,
      withPartner: true,
      networkUserIds,
      limit,
    });
    if (result.error) {
      console.error("[loadUnifiedManagementData] head-partner leads 조회 실패:", result.error);
    }
    return result.data;
  }

  const sessionClient = await createClient();
  const result = await fetchDashboardLeads(sessionClient, {
    withPartner: true,
    limit,
  });
  if (result.error) {
    console.error("[loadUnifiedManagementData] session leads 조회 실패:", result.error);
  }
  return result.data;
}

async function loadUsersForViewer(
  viewerId: string,
  role: UserRole,
): Promise<DbUserRow[]> {
  if (hasOrgWideDashboardAccess(role)) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("users")
      .select(USER_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[loadUnifiedManagementData] admin users 조회 실패:", error);
    }
    return mapUserRows(data);
  }

  if (role === "노무사") {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("users")
      .select(USER_SELECT)
      .in("role", ["노무사", "대표노무사", "관리자"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[loadUnifiedManagementData] attorney users 조회 실패:", error);
    }
    return mapUserRows(data);
  }

  if (isHeadPartnerRole(role)) {
    return mapUserRows(
      await fetchHeadPartnerNetworkUserRows<Record<string, unknown>>(viewerId, USER_SELECT),
    );
  }

  if (isPartnerScopedRole(role)) {
    const sessionClient = await createClient();
    const { data, error } = await sessionClient
      .from("users")
      .select(USER_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[loadUnifiedManagementData] partner users 조회 실패:", error);
    }
    return mapUserRows(data);
  }

  const sessionClient = await createClient();
  const { data, error } = await sessionClient
    .from("users")
    .select(USER_SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[loadUnifiedManagementData] session users 조회 실패:", error);
  }
  return mapUserRows(data);
}

export async function loadUnifiedManagementData(
  viewerId: string,
  viewerRole: UserRole,
  adminAgentId: string,
): Promise<UnifiedManagementData> {
  const headPartnerId = getPartnerNetworkHeadId(viewerId, viewerRole);
  const adminClient = createAdminClient();

  const rawLeads = await loadLeadsForViewer(viewerId, viewerRole);
  const leadRelatedUserIds = collectLeadRelatedUserIds(rawLeads);

  const [users, lineageUsers] = await Promise.all([
    loadUsersForViewer(viewerId, viewerRole),
    fetchUsersForLeadLineage(viewerId, viewerRole, leadRelatedUserIds),
  ]);

  const partnerNetwork =
    viewerRole === "노무사"
      ? EMPTY_PARTNER_NETWORK
      : await loadPartnerNetworkDashboard(adminClient, { headPartnerId });

  const userMap: Record<string, { name: string; parent_agent_id: string | null; role: string }> =
    {};
  users.forEach((u) => {
    userMap[u.id] = {
      name: u.name,
      parent_agent_id: u.parent_agent_id,
      role: u.role,
    };
  });

  const enrichedUsers = enrichUsersWithLineage(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      agent_id: u.agent_id,
      is_active: u.is_active,
      parent_agent_id: u.parent_agent_id,
    })),
  );

  const attorneys = users
    .filter((u) => u.role === "노무사" && u.is_active)
    .map((u) => ({ id: u.id, name: u.name }));

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
  const totalUsers = users.length;
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

  const parentPartnerOptions: ParentPartnerOption[] = users
    .filter((u) => u.role === "총판영업자" || u.role === "총괄공식파트너")
    .map((u) => ({
      id: u.id,
      name: u.name,
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
