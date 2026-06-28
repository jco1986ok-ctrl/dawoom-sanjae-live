import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { describeInflowLink } from "@/lib/lead-attribution";
import { collectPartnerSubtreeIds } from "@/lib/build-organization-tree";
import { resolveLeadFeeAmount } from "@/lib/lead-fee";

export type AnalyticsViewTier = "executive" | "partner" | "staff";

export type PipelineFunnel = {
  newLeads: number;
  consultDelegation: number;
  agencyReview: number;
  approved: number;
};

export type PartnerRankItem = {
  id: string;
  name: string;
  count: number;
  feeTotal: number;
  rank: number;
};

export type ChannelTrend = {
  directCount: number;
  partnerCount: number;
  directPct: number;
  partnerPct: number;
  total: number;
};

export type PartnerLineStats = {
  totalDb: number;
  delegationDone: number;
};

const FUNNEL_NEW = new Set(["신규", "부재중", "연락대기"]);
const FUNNEL_CONSULT = new Set(["상담중", "계약완료", "서류준비중"]);
const FUNNEL_REVIEW = new Set(["공단접수(심사중)", "불승인(재심사)"]);
const FUNNEL_APPROVED = new Set(["산재승인(완료)"]);

const DELEGATION_DONE = new Set([
  "계약완료",
  "서류준비중",
  "공단접수(심사중)",
  "산재승인(완료)",
  "불승인(재심사)",
]);

const PARTNER_ROLES = new Set(["총판영업자", "하위영업자", "총괄공식파트너"]);

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export function getAnalyticsViewTier(role: DashboardTestRole): AnalyticsViewTier {
  switch (role) {
    case "마스터":
    case "대표노무사":
    case "총괄파트너":
      return "executive";
    case "공식파트너":
    case "제휴파트너":
      return "partner";
    case "노무사":
      return "staff";
  }
}

export function getRankMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `${rank}위`;
}

function isThisMonth(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isDelegationComplete(lead: LeadDetail): boolean {
  return lead.has_weim === true || DELEGATION_DONE.has(lead.consultation_status);
}

export function computePipelineFunnel(leads: LeadDetail[]): PipelineFunnel {
  let newLeads = 0;
  let consultDelegation = 0;
  let agencyReview = 0;
  let approved = 0;

  for (const lead of leads) {
    const s = lead.consultation_status;
    if (FUNNEL_NEW.has(s)) newLeads++;
    else if (FUNNEL_CONSULT.has(s)) consultDelegation++;
    else if (FUNNEL_REVIEW.has(s)) agencyReview++;
    else if (FUNNEL_APPROVED.has(s)) approved++;
  }

  return { newLeads, consultDelegation, agencyReview, approved };
}

/** 본사 다이렉트 vs 파트너 링크 */
export function computeChannelTrend(leads: LeadDetail[]): ChannelTrend {
  let directCount = 0;
  let partnerCount = 0;

  for (const lead of leads) {
    const inflow = describeInflowLink(lead.referral_source, lead.referrer);
    if (inflow.type === "natural" || inflow.type === "unknown") {
      directCount++;
    } else {
      partnerCount++;
    }
  }

  const total = directCount + partnerCount;
  return {
    directCount,
    partnerCount,
    directPct: total > 0 ? Math.round((directCount / total) * 100) : 0,
    partnerPct: total > 0 ? Math.round((partnerCount / total) * 100) : 0,
    total,
  };
}

export function computeTopPartners(
  leads: LeadDetail[],
  users: AdminUserListItem[],
  limit = 5,
  monthOnly = true,
): PartnerRankItem[] {
  const userById = new Map(users.map((u) => [u.id, u]));
  const counts = new Map<string, { count: number; feeTotal: number }>();

  for (const lead of leads) {
    if (monthOnly && !isThisMonth(lead.created_at)) continue;
    const uid = lead.referred_by_user_id;
    if (!uid) continue;
    const user = userById.get(uid);
    if (!user || !PARTNER_ROLES.has(user.role)) continue;
    const prev = counts.get(uid) ?? { count: 0, feeTotal: 0 };
    counts.set(uid, {
      count: prev.count + 1,
      feeTotal: prev.feeTotal + resolveLeadFeeAmount(lead),
    });
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].feeTotal - a[1].feeTotal)
    .slice(0, limit)
    .map(([id, stats], i) => ({
      id,
      name: userById.get(id)?.name ?? "알 수 없음",
      count: stats.count,
      feeTotal: stats.feeTotal,
      rank: i + 1,
    }));
}

/** viewer 기준 라인에 속한 referred_by ID 집합 */
export function getLineReferredByIds(
  viewerId: string,
  testRole: DashboardTestRole,
  users: AdminUserListItem[],
): Set<string> {
  if (testRole === "제휴파트너") {
    return new Set([viewerId]);
  }

  if (testRole === "공식파트너") {
    const partnerRows = users.map((u) => ({
      id: u.id,
      role: u.role,
      parent_agent_id: u.parent_agent_id,
    }));
    return collectPartnerSubtreeIds(viewerId, partnerRows);
  }

  return new Set([viewerId]);
}

export function filterLeadsByLine(
  leads: LeadDetail[],
  viewerId: string,
  testRole: DashboardTestRole,
  users: AdminUserListItem[],
): LeadDetail[] {
  const lineIds = getLineReferredByIds(viewerId, testRole, users);
  return leads.filter((l) => l.referred_by_user_id && lineIds.has(l.referred_by_user_id));
}

export function computePartnerLineStats(leads: LeadDetail[]): PartnerLineStats {
  return {
    totalDb: leads.length,
    delegationDone: leads.filter(isDelegationComplete).length,
  };
}

/** 이번 달 하위 파트너 TOP N (직접·간접 하위) */
export function computeSubPartnerTop(
  leads: LeadDetail[],
  viewerId: string,
  testRole: DashboardTestRole,
  users: AdminUserListItem[],
  limit = 3,
): PartnerRankItem[] {
  const lineIds = getLineReferredByIds(viewerId, testRole, users);
  lineIds.delete(viewerId);

  const userById = new Map(users.map((u) => [u.id, u]));
  const counts = new Map<string, { count: number; feeTotal: number }>();

  for (const lead of leads) {
    if (!isThisMonth(lead.created_at)) continue;
    const uid = lead.referred_by_user_id;
    if (!uid || !lineIds.has(uid)) continue;
    const prev = counts.get(uid) ?? { count: 0, feeTotal: 0 };
    counts.set(uid, {
      count: prev.count + 1,
      feeTotal: prev.feeTotal + resolveLeadFeeAmount(lead),
    });
  }

  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].feeTotal - a[1].feeTotal)
    .slice(0, limit)
    .map(([id, stats], i) => ({
      id,
      name: userById.get(id)?.name ?? "알 수 없음",
      count: stats.count,
      feeTotal: stats.feeTotal,
      rank: i + 1,
    }));
}

export function filterLeadsForAnalytics(
  leads: LeadDetail[],
  tier: AnalyticsViewTier,
  viewerId: string,
  testRole: DashboardTestRole,
  users: AdminUserListItem[],
): LeadDetail[] {
  if (tier === "executive") return leads;
  if (tier === "partner") return filterLeadsByLine(leads, viewerId, testRole, users);
  return leads.filter(
    (l) => l.assigned_user_id === viewerId || l.assigned_to === viewerId,
  );
}
