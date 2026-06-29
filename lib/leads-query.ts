/** 마이그레이션 전후 공통 — pdf_url 없이도 조회 가능한 코어 컬럼 */
export const LEADS_LIST_SELECT_CORE =
  "id, customer_name, phone, disease_name, disease_category, fee_amount, consultation_status, current_owner_role, assigned_user_id, assignment_memo, is_read, callback_date, last_updated_at, created_at, referral_source, notes" as const;

/** pdf_url·docs_status·has_weim·other_docs 마이그레이션 적용 후 */
export const LEADS_LIST_SELECT =
  `${LEADS_LIST_SELECT_CORE}, pdf_url, docs_status, has_weim, other_docs` as const;

export const LEADS_LIST_SELECT_WITH_PARTNER =
  `${LEADS_LIST_SELECT}, referred_by_user_id, master_agent_id` as const;

export const LEADS_LIST_SELECT_ADMIN =
  `${LEADS_LIST_SELECT_WITH_PARTNER}, assigned_to` as const;

/** pdf_url 컬럼 없을 때 폴백용 */
export const LEADS_LIST_SELECT_CORE_WITH_PARTNER =
  `${LEADS_LIST_SELECT_CORE}, referred_by_user_id, master_agent_id` as const;

export const LEADS_LIST_SELECT_CORE_ADMIN =
  `${LEADS_LIST_SELECT_CORE_WITH_PARTNER}, assigned_to` as const;

/** disease_category 마이그레이션 전 */
export const LEADS_LIST_SELECT_CORE_LEGACY =
  "id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes" as const;

export const LEADS_LIST_SELECT_LEGACY =
  `${LEADS_LIST_SELECT_CORE_LEGACY}, pdf_url, docs_status, has_weim, other_docs` as const;

export const LEADS_LIST_SELECT_WITH_PARTNER_LEGACY =
  `${LEADS_LIST_SELECT_LEGACY}, referred_by_user_id, master_agent_id` as const;

export const LEADS_LIST_SELECT_CORE_WITH_PARTNER_LEGACY =
  `${LEADS_LIST_SELECT_CORE_LEGACY}, referred_by_user_id, master_agent_id` as const;

export const LEADS_LIST_SELECT_ADMIN_LEGACY =
  `${LEADS_LIST_SELECT_WITH_PARTNER_LEGACY}, assigned_to` as const;

export const LEADS_LIST_SELECT_CORE_ADMIN_LEGACY =
  `${LEADS_LIST_SELECT_CORE_WITH_PARTNER_LEGACY}, assigned_to` as const;

/** V2 처리 담당자(users) 조인 — PostgREST embed */
export const LEADS_ASSIGNEE_EMBED = "assignee:users!assigned_user_id(name)" as const;

export function withLeadsAssigneeJoin(select: string): string {
  return `${select}, ${LEADS_ASSIGNEE_EMBED}`;
}

/** pdf_url 포함 → 코어 순서로 SELECT 시도 */
export const LEADS_LIST_SELECT_FALLBACKS = [
  withLeadsAssigneeJoin(LEADS_LIST_SELECT_ADMIN),
  LEADS_LIST_SELECT_ADMIN,
  withLeadsAssigneeJoin(LEADS_LIST_SELECT_CORE_ADMIN),
  LEADS_LIST_SELECT_CORE_ADMIN,
  withLeadsAssigneeJoin(LEADS_LIST_SELECT_ADMIN_LEGACY),
  LEADS_LIST_SELECT_ADMIN_LEGACY,
  withLeadsAssigneeJoin(LEADS_LIST_SELECT_CORE_ADMIN_LEGACY),
  LEADS_LIST_SELECT_CORE_ADMIN_LEGACY,
] as const;

export const LEADS_LIST_SELECT_WITH_PARTNER_FALLBACKS = [
  LEADS_LIST_SELECT_WITH_PARTNER,
  LEADS_LIST_SELECT_CORE_WITH_PARTNER,
  LEADS_LIST_SELECT_WITH_PARTNER_LEGACY,
  LEADS_LIST_SELECT_CORE_WITH_PARTNER_LEGACY,
] as const;

export const LEADS_LIST_SELECT_FALLBACKS_BASIC = [
  LEADS_LIST_SELECT,
  LEADS_LIST_SELECT_CORE,
  LEADS_LIST_SELECT_LEGACY,
  LEADS_LIST_SELECT_CORE_LEGACY,
] as const;
