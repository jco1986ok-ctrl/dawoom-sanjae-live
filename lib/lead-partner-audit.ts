import { NATURAL_INFLOW, FALLBACK_REFERRER_DISPLAY } from "@/lib/capture-referrer";
import {
  describeAgentAccount,
  describeInflowLink,
  resolvePartnerForLead,
} from "@/lib/lead-attribution";
import type { LeadDetail } from "@/lib/lead-detail";
import { enrichLeadRow } from "@/lib/enrich-leads";
import type { LineageUserRow } from "@/lib/lead-lineage";
import { formatLeadLineageLabel } from "@/lib/lead-lineage";

/** 파트너 유입 확인 상태 */
export type PartnerAuditStatus =
  | "confirmed"
  | "ref_unresolved"
  | "name_unresolved"
  | "natural"
  | "missing"
  | "notes_traceable";

export const PARTNER_AUDIT_STATUS_LABEL: Record<PartnerAuditStatus, string> = {
  confirmed: "파트너 확인됨",
  ref_unresolved: "ref 코드·계정 미매칭",
  name_unresolved: "이름 링크·계정 미매칭",
  natural: "자연유입",
  missing: "유입 정보 없음",
  notes_traceable: "메모에만 단서 있음",
};

export type NotesAttribution = {
  referrerLine: string | null;
  linkLine: string | null;
  refFromLink: string | null;
  nameFromLink: string | null;
  isNaturalLink: boolean;
};

export type PartnerAuditRow = {
  id: string;
  customer_name: string;
  phone: string | null;
  created_at: string;
  consultation_status: string;
  status: PartnerAuditStatus;
  statusLabel: string;
  /** 유입 라인 (마스터 → … → 파트너) */
  lineageLabel: string;
  partnerName: string | null;
  partnerAgentId: string | null;
  referral_source: string | null;
  referrer: string | null;
  referred_by_user_id: string | null;
  master_agent_id: string | null;
  inflowLabel: string;
  inflowLinkParam: string | null;
  notesAttribution: NotesAttribution;
  notesExcerpt: string | null;
  isDynamicFormV2: boolean;
  needsReview: boolean;
};

type LeadInput = Pick<
  LeadDetail,
  | "id"
  | "customer_name"
  | "phone"
  | "created_at"
  | "consultation_status"
  | "referral_source"
  | "referrer"
  | "notes"
  | "referred_by_user_id"
  | "master_agent_id"
>;

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
  const nameFromLink = linkLine?.match(NAME_FROM_LINK_RE)?.[1]?.trim() ?? null;
  const isNaturalLink = Boolean(linkLine && /자연유입/.test(linkLine));

  return {
    referrerLine,
    linkLine,
    refFromLink,
    nameFromLink,
    isNaturalLink,
  };
}

function classifyStatus(
  lead: LeadInput,
  partnerResolved: boolean,
  agentUnresolved: boolean,
  referralSource: string | null,
  notesAttr: NotesAttribution,
): PartnerAuditStatus {
  if (partnerResolved) return "confirmed";

  const src = referralSource?.trim() || null;

  if (src?.startsWith("name:")) {
    return agentUnresolved ? "name_unresolved" : "confirmed";
  }

  if (src && !src.startsWith("name:")) {
    return "ref_unresolved";
  }

  const ref = lead.referrer?.trim() || notesAttr.referrerLine;
  if (
    ref &&
    ref !== NATURAL_INFLOW &&
    ref !== FALLBACK_REFERRER_DISPLAY
  ) {
    if (notesAttr.refFromLink || notesAttr.nameFromLink) {
      return "notes_traceable";
    }
    return "notes_traceable";
  }

  if (
    notesAttr.isNaturalLink ||
    ref === NATURAL_INFLOW ||
    (!src && !notesAttr.refFromLink && !notesAttr.nameFromLink && notesAttr.isNaturalLink)
  ) {
    return "natural";
  }

  if (notesAttr.refFromLink || notesAttr.nameFromLink || notesAttr.referrerLine) {
    return "notes_traceable";
  }

  if (!src && !lead.referred_by_user_id && !ref) {
    return "missing";
  }

  return "missing";
}

export function auditLeadPartnerAttribution(
  lead: LeadInput,
  userById: Record<string, LineageUserRow>,
  userByAgentId: Record<string, LineageUserRow>,
): PartnerAuditRow {
  const enriched = enrichLeadRow(lead, userById, userByAgentId);
  const notesAttr = parseNotesAttribution(lead.notes);
  const inflow = describeInflowLink(lead.referral_source, lead.referrer);
  const partner = resolvePartnerForLead(
    lead.referred_by_user_id,
    lead.referral_source,
    userById,
    userByAgentId,
  );
  const agent = describeAgentAccount(partner, lead.referral_source);
  const partnerResolved = Boolean(partner?.name && partner.agent_id && !agent.unresolved);

  const status = classifyStatus(
    lead,
    partnerResolved,
    agent.unresolved,
    lead.referral_source,
    notesAttr,
  );

  const needsReview =
    status === "ref_unresolved" ||
    status === "name_unresolved" ||
    status === "missing" ||
    status === "notes_traceable";

  const notesLines = (lead.notes ?? "")
    .split("\n")
    .filter((l) => /^\[(추천인|유입 링크)\]/.test(l.trim()))
    .slice(0, 3);

  return {
    id: lead.id,
    customer_name: lead.customer_name,
    phone: lead.phone,
    created_at: lead.created_at,
    consultation_status: lead.consultation_status,
    status,
    statusLabel: PARTNER_AUDIT_STATUS_LABEL[status],
    lineageLabel: enriched.lineage_label || formatLeadLineageLabel(enriched.lineage),
    partnerName: enriched.partner_name ?? agent.name,
    partnerAgentId: enriched.partner_agent_id ?? agent.agentId,
    referral_source: lead.referral_source,
    referrer: lead.referrer ?? notesAttr.referrerLine,
    referred_by_user_id: lead.referred_by_user_id ?? null,
    master_agent_id: lead.master_agent_id ?? null,
    inflowLabel: inflow.label,
    inflowLinkParam: inflow.linkParam,
    notesAttribution: notesAttr,
    notesExcerpt: notesLines.length > 0 ? notesLines.join(" · ") : null,
    isDynamicFormV2: Boolean(lead.notes?.includes("[접수 폼] 신규 DynamicForm v2")),
    needsReview,
  };
}

export function auditLeadsPartnerAttribution(
  leads: LeadInput[],
  users: LineageUserRow[],
): PartnerAuditRow[] {
  const userById: Record<string, LineageUserRow> = {};
  const userByAgentId: Record<string, LineageUserRow> = {};
  for (const u of users) {
    userById[u.id] = u;
    userByAgentId[u.agent_id] = u;
  }

  return leads
    .map((lead) => auditLeadPartnerAttribution(lead, userById, userByAgentId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function summarizePartnerAudit(rows: PartnerAuditRow[]) {
  const byStatus = {} as Record<PartnerAuditStatus, number>;
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  return {
    total: rows.length,
    needsReview: rows.filter((r) => r.needsReview).length,
    confirmed: byStatus.confirmed ?? 0,
    byStatus,
  };
}
