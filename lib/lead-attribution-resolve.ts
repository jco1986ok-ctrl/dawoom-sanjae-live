import {
  FALLBACK_REFERRER_DISPLAY,
  NATURAL_INFLOW,
} from "@/lib/capture-referrer";
import { normalizePartnerName } from "@/lib/referral-resolve";
import type { LineageUserRow } from "@/lib/lead-lineage";

export type NotesAttribution = {
  referrerLine: string | null;
  linkLine: string | null;
  refFromLink: string | null;
  nameFromLink: string | null;
  isNaturalLink: boolean;
};

export type EffectiveAttribution = {
  referralSource: string | null;
  referrer: string | null;
  notesAttribution: NotesAttribution;
};

const PARTNER_ROLES = new Set([
  "하위영업자",
  "총판영업자",
  "총괄공식파트너",
  "관리자",
]);

const REFERRER_LINE_RE = /^\[추천인\]\s*(.+)$/i;
const LINK_LINE_RE = /^\[유입 링크\]\s*(.+)$/i;
const REF_FROM_LINK_RE = /\?ref=([^\s&]+)/i;
const NAME_FROM_LINK_RE = /\?name=([^\s(]+)/i;

export function parseNotesAttribution(notes: string | null | undefined): NotesAttribution {
  let referrerLine: string | null = null;
  let linkLine: string | null = null;

  if (notes) {
    for (const raw of notes.split("\n")) {
      const line = raw.trim();
      const refMatch = line.match(REFERRER_LINE_RE);
      if (refMatch) {
        referrerLine = refMatch[1].trim();
        continue;
      }
      const linkMatch = line.match(LINK_LINE_RE);
      if (linkMatch) {
        linkLine = linkMatch[1].trim();
      }
    }
  }

  const refFromLink = linkLine?.match(REF_FROM_LINK_RE)?.[1]?.trim() ?? null;
  let nameFromLink = linkLine?.match(NAME_FROM_LINK_RE)?.[1]?.trim() ?? null;
  if (nameFromLink) {
    try {
      nameFromLink = decodeURIComponent(nameFromLink);
    } catch {
      /* keep raw */
    }
  }
  const isNaturalLink = Boolean(linkLine && /자연유입/.test(linkLine));

  return {
    referrerLine,
    linkLine,
    refFromLink,
    nameFromLink,
    isNaturalLink,
  };
}

function isNaturalOrFallback(value: string | null | undefined): boolean {
  const v = value?.trim();
  return !v || v === NATURAL_INFLOW || v === FALLBACK_REFERRER_DISPLAY;
}

function isLikelyAgentCode(value: string): boolean {
  const v = value.trim();
  if (!v || isNaturalOrFallback(v)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9_-]{2,}$/.test(v);
}

/** DB 컬럼이 비어 있어도 접수 메모 [추천인]/[유입 링크]에서 유입 단서 복원 */
export function resolveEffectiveAttribution(lead: {
  referral_source?: string | null;
  referrer?: string | null;
  notes?: string | null;
}): EffectiveAttribution {
  const notesAttribution = parseNotesAttribution(lead.notes);
  let referralSource = lead.referral_source?.trim() || null;
  let referrer = lead.referrer?.trim() || null;

  if (!referralSource && notesAttribution.refFromLink) {
    referralSource = notesAttribution.refFromLink;
  } else if (!referralSource && notesAttribution.nameFromLink) {
    referralSource = `name:${notesAttribution.nameFromLink}`;
  }

  if (!referrer && notesAttribution.referrerLine) {
    referrer = notesAttribution.referrerLine;
  }

  if (
    isNaturalOrFallback(referrer) &&
    notesAttribution.referrerLine &&
    !isNaturalOrFallback(notesAttribution.referrerLine)
  ) {
    referrer = notesAttribution.referrerLine;
    if (!referralSource && isLikelyAgentCode(notesAttribution.referrerLine)) {
      referralSource = notesAttribution.referrerLine;
    }
  }

  if (isNaturalOrFallback(referrer) && notesAttribution.refFromLink) {
    referrer = notesAttribution.refFromLink;
  }

  if (
    isNaturalOrFallback(referrer) &&
    notesAttribution.nameFromLink &&
    !notesAttribution.isNaturalLink
  ) {
    referrer = notesAttribution.nameFromLink;
  }

  return { referralSource, referrer, notesAttribution };
}

export function findPartnerUserByName(
  rawName: string | null | undefined,
  userById: Record<string, LineageUserRow>,
): (LineageUserRow & { id: string }) | null {
  const normalized = normalizePartnerName(rawName);
  if (!normalized) return null;

  const partners = Object.values(userById).filter((u) => PARTNER_ROLES.has(String(u.role)));

  const exact = partners.filter(
    (u) => normalizePartnerName(u.name) === normalized,
  );
  if (exact.length === 1) return exact[0];

  const compact = normalized.replace(/\s+/g, "");
  const compactMatches = partners.filter((u) => {
    const n = normalizePartnerName(u.name);
    return n && n.replace(/\s+/g, "") === compact;
  });
  if (compactMatches.length === 1) return compactMatches[0];

  return null;
}

type PartnerRow = LineageUserRow & { id: string };

export function resolvePartnerForLeadEnhanced(
  lead: {
    referred_by_user_id?: string | null;
    referral_source?: string | null;
    referrer?: string | null;
    notes?: string | null;
  },
  userById: Record<string, PartnerRow>,
  userByAgentId: Record<string, PartnerRow>,
): PartnerRow | null {
  const effective = resolveEffectiveAttribution(lead);

  if (lead.referred_by_user_id && userById[lead.referred_by_user_id]) {
    return userById[lead.referred_by_user_id];
  }

  const src = effective.referralSource;
  if (src && !src.startsWith("name:") && userByAgentId[src]) {
    return userByAgentId[src];
  }

  if (src?.startsWith("name:")) {
    const byName = findPartnerUserByName(src.slice(5), userById);
    if (byName) return byName;
  }

  if (effective.notesAttribution.nameFromLink) {
    const byNotesName = findPartnerUserByName(effective.notesAttribution.nameFromLink, userById);
    if (byNotesName) return byNotesName;
  }

  if (effective.notesAttribution.refFromLink && userByAgentId[effective.notesAttribution.refFromLink]) {
    return userByAgentId[effective.notesAttribution.refFromLink];
  }

  if (effective.referrer && isLikelyAgentCode(effective.referrer) && userByAgentId[effective.referrer]) {
    return userByAgentId[effective.referrer];
  }

  if (effective.referrer && !isNaturalOrFallback(effective.referrer) && !isLikelyAgentCode(effective.referrer)) {
    const byReferrerName = findPartnerUserByName(effective.referrer, userById);
    if (byReferrerName) return byReferrerName;
  }

  return null;
}

export function formatPartnerDisplayLabel(lead: {
  partner_name?: string | null;
  lineage?: { name: string }[];
  agent?: { name?: string | null; agentId?: string | null };
  referral_source?: string | null;
  notesAttribution?: NotesAttribution;
}): string | null {
  const fromLineage = lead.lineage?.[lead.lineage.length - 1]?.name;
  const fromNamePrefix =
    lead.referral_source?.startsWith("name:")
      ? lead.referral_source.slice(5).trim()
      : null;

  return (
    lead.partner_name?.trim() ||
    fromLineage?.trim() ||
    lead.agent?.name?.trim() ||
    fromNamePrefix ||
    lead.notesAttribution?.nameFromLink?.trim() ||
    lead.notesAttribution?.refFromLink?.trim() ||
    lead.agent?.agentId?.trim() ||
    null
  );
}

export function buildAttributionTraceLabel(
  effective: EffectiveAttribution,
  partnerName: string | null,
): string | null {
  const parts: string[] = [];
  const { notesAttribution } = effective;

  if (notesAttribution.linkLine) {
    parts.push(notesAttribution.linkLine);
  } else if (effective.referralSource) {
    parts.push(`ref: ${effective.referralSource}`);
  }

  if (partnerName) {
    parts.push(`→ ${partnerName}`);
  } else if (notesAttribution.refFromLink) {
    parts.push(`→ ref ${notesAttribution.refFromLink} (계정 미매칭)`);
  } else if (notesAttribution.nameFromLink) {
    parts.push(`→ ${notesAttribution.nameFromLink} (계정 미매칭)`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
