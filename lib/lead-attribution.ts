import { NATURAL_INFLOW, FALLBACK_REFERRER_DISPLAY } from "@/lib/capture-referrer";

export type InflowType =
  | "partner_ref"
  | "partner_name_legacy"
  | "natural"
  | "unknown";

export type InflowInfo = {
  type: InflowType;
  label: string;
  /** 표시용 링크 파라미터 예: ?ref=AG-123 */
  linkParam: string | null;
};

export type AgentAccountInfo = {
  name: string | null;
  agentId: string | null;
  /** 매칭됐지만 users에 없음 */
  unresolved: boolean;
};

type PartnerRow = {
  name: string;
  agent_id: string;
  parent_agent_id?: string | null;
};

export function describeInflowLink(
  referralSource: string | null | undefined,
  referrer?: string | null | undefined,
): InflowInfo {
  const src = referralSource?.trim() || null;
  const ref = referrer?.trim() || null;

  if (src?.startsWith("name:")) {
    const legacyName = src.slice(5);
    return {
      type: "partner_name_legacy",
      label: "이름 링크 (구형)",
      linkParam: `?name=${legacyName}`,
    };
  }

  if (src) {
    return {
      type: "partner_ref",
      label: "파트너 링크",
      linkParam: `?ref=${src}`,
    };
  }

  if (
    ref &&
    ref !== NATURAL_INFLOW &&
    ref !== FALLBACK_REFERRER_DISPLAY
  ) {
    return {
      type: "partner_ref",
      label: "파트너 링크",
      linkParam: `?ref=${ref}`,
    };
  }

  if (!src && (!ref || ref === NATURAL_INFLOW || ref === FALLBACK_REFERRER_DISPLAY)) {
    return {
      type: "natural",
      label: "자연유입",
      linkParam: null,
    };
  }

  return {
    type: "unknown",
    label: ref ?? "유입 미상",
    linkParam: null,
  };
}

export function describeAgentAccount(
  partner: PartnerRow | null | undefined,
  referralSource: string | null | undefined,
): AgentAccountInfo {
  if (partner?.name && partner.agent_id) {
    return {
      name: partner.name,
      agentId: partner.agent_id,
      unresolved: false,
    };
  }

  const src = referralSource?.trim() || null;
  if (src && !src.startsWith("name:")) {
    return {
      name: null,
      agentId: src,
      unresolved: true,
    };
  }

  if (src?.startsWith("name:")) {
    return {
      name: src.slice(5),
      agentId: null,
      unresolved: true,
    };
  }

  return { name: null, agentId: null, unresolved: false };
}

export function buildUserMaps(
  users: Array<{
    id: string;
    name: string;
    agent_id: string;
    parent_agent_id?: string | null;
  }>,
) {
  const userById: Record<string, PartnerRow & { id: string }> = {};
  const userByAgentId: Record<string, PartnerRow & { id: string }> = {};

  for (const u of users) {
    const row = {
      id: u.id,
      name: u.name,
      agent_id: u.agent_id,
      parent_agent_id: u.parent_agent_id ?? null,
    };
    userById[u.id] = row;
    userByAgentId[u.agent_id] = row;
  }

  return { userById, userByAgentId };
}

export function resolvePartnerForLead(
  referredByUserId: string | null | undefined,
  referralSource: string | null | undefined,
  userById: Record<string, PartnerRow & { id: string }>,
  userByAgentId: Record<string, PartnerRow & { id: string }>,
): (PartnerRow & { id: string }) | null {
  if (referredByUserId && userById[referredByUserId]) {
    return userById[referredByUserId];
  }

  const src = referralSource?.trim();
  if (src && !src.startsWith("name:") && userByAgentId[src]) {
    return userByAgentId[src];
  }

  return null;
}
