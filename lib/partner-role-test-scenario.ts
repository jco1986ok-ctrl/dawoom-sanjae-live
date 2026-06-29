import type { AdminUserListItem } from "@/lib/user-lineage";
import { collectPartnerSubtreeIds } from "@/lib/build-organization-tree";

export type LeadReferralRef = {
  referred_by_user_id?: string | null;
  master_agent_id?: string | null;
};

export type PartnerRoleTestScenario = {
  official: AdminUserListItem | null;
  affiliate: AdminUserListItem | null;
  officialLeadCount: number;
  affiliateLeadCount: number;
  affiliateCount: number;
};

function countDirectLeads(leads: LeadReferralRef[], userId: string): number {
  return leads.filter((l) => l.referred_by_user_id === userId).length;
}

function leadInOfficialLine(
  lead: LeadReferralRef,
  officialId: string,
  subtreeIds: Set<string>,
): boolean {
  if (lead.master_agent_id === officialId) return true;
  return !!(lead.referred_by_user_id && subtreeIds.has(lead.referred_by_user_id));
}

function countLeadsForIds(
  leads: LeadReferralRef[],
  officialId: string,
  ids: Set<string>,
): number {
  return leads.filter((l) => leadInOfficialLine(l, officialId, ids)).length;
}

/** 직책 테스트 — 공식·제휴 파트너에 고객·산하 제휴가 있는 계정 우선 */
export function resolvePartnerRoleTestScenario(
  users: AdminUserListItem[],
  leads: LeadReferralRef[],
): PartnerRoleTestScenario {
  const officials = users.filter((u) => u.role === "총판영업자" && u.is_active);
  const affiliates = users.filter((u) => u.role === "하위영업자" && u.is_active);
  const partnerRows = users.map((u) => ({
    id: u.id,
    role: u.role,
    parent_agent_id: u.parent_agent_id,
  }));

  let bestOfficial: AdminUserListItem | null = null;
  let bestScore = -1;
  let bestSubtreeLeadCount = 0;
  let bestAffiliateCount = 0;

  for (const official of officials) {
    const subtreeIds = collectPartnerSubtreeIds(official.id, partnerRows);
    const leadCount = countLeadsForIds(leads, official.id, subtreeIds);
    const affCount = affiliates.filter((a) => a.parent_agent_id === official.id).length;
    const score = leadCount * 1000 + affCount * 100 + countDirectLeads(leads, official.id);

    if (score > bestScore || (score === bestScore && affCount > bestAffiliateCount)) {
      bestScore = score;
      bestOfficial = official;
      bestSubtreeLeadCount = leadCount;
      bestAffiliateCount = affCount;
    }
  }

  const pickAffiliateUnder = (officialId: string): AdminUserListItem | null => {
    const under = affiliates.filter((a) => a.parent_agent_id === officialId);
    if (under.length === 0) return null;

    let best: AdminUserListItem | null = null;
    let bestCount = -1;
    for (const aff of under) {
      const c = countDirectLeads(leads, aff.id);
      if (c > bestCount) {
        bestCount = c;
        best = aff;
      }
    }
    return best ?? under[0];
  };

  let bestAffiliate: AdminUserListItem | null = bestOfficial
    ? pickAffiliateUnder(bestOfficial.id)
    : null;
  let bestAffLeadCount = bestAffiliate ? countDirectLeads(leads, bestAffiliate.id) : 0;

  if (!bestAffiliate) {
    for (const aff of affiliates) {
      const c = countDirectLeads(leads, aff.id);
      if (c > bestAffLeadCount) {
        bestAffLeadCount = c;
        bestAffiliate = aff;
      }
    }
  }

  if (!bestOfficial && bestAffiliate?.parent_agent_id) {
    bestOfficial = users.find((u) => u.id === bestAffiliate!.parent_agent_id) ?? null;
    if (bestOfficial) {
      const subtreeIds = collectPartnerSubtreeIds(bestOfficial.id, partnerRows);
      bestSubtreeLeadCount = countLeadsForIds(leads, bestOfficial.id, subtreeIds);
      bestAffiliateCount = affiliates.filter((a) => a.parent_agent_id === bestOfficial!.id).length;
    }
  }

  if (!bestOfficial && officials.length > 0) {
    bestOfficial =
      officials.find((o) => affiliates.some((a) => a.parent_agent_id === o.id)) ?? officials[0];
    bestAffiliateCount = affiliates.filter((a) => a.parent_agent_id === bestOfficial!.id).length;
    const subtreeIds = collectPartnerSubtreeIds(bestOfficial.id, partnerRows);
    bestSubtreeLeadCount = countLeadsForIds(leads, bestOfficial.id, subtreeIds);
    if (!bestAffiliate && bestAffiliateCount > 0) {
      bestAffiliate = pickAffiliateUnder(bestOfficial.id);
      bestAffLeadCount = bestAffiliate ? countDirectLeads(leads, bestAffiliate.id) : 0;
    }
  }

  return {
    official: bestOfficial,
    affiliate: bestAffiliate ?? affiliates[0] ?? null,
    officialLeadCount: bestSubtreeLeadCount,
    affiliateLeadCount: bestAffLeadCount,
    affiliateCount: bestAffiliateCount,
  };
}

export function formatPartnerRoleTestHint(
  testRole: "공식파트너" | "제휴파트너",
  scenario: PartnerRoleTestScenario,
): string | null {
  if (testRole === "공식파트너") {
    if (scenario.officialLeadCount > 0) {
      return `제휴 ${scenario.affiliateCount}명 · 소개고객 ${scenario.officialLeadCount}건`;
    }
    if (scenario.affiliateCount > 0) {
      return `제휴 ${scenario.affiliateCount}명 · 소개고객 없음`;
    }
    return "산하 제휴·소개고객 없음";
  }

  if (scenario.affiliateLeadCount > 0) {
    return `본인 소개고객 ${scenario.affiliateLeadCount}건`;
  }
  return "본인 소개고객 없음";
}
