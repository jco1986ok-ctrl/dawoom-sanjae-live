import type { LeadDetail } from "@/lib/lead-detail";

/** Supabase Realtime postgres_changes payload.new / .old */
export type RealtimeLeadRow = Record<string, unknown>;

function str(value: unknown, fallback: string): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function nullableStr(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function nullableNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nullableBool(value: unknown): boolean | null {
  if (value == null) return null;
  return Boolean(value);
}

/** Realtime INSERT — DB 행 → LeadDetail (enrichment 없음) */
export function realtimeRowToLeadDetail(row: RealtimeLeadRow): LeadDetail {
  return {
    id: str(row.id, ""),
    customer_name: str(row.customer_name, "—"),
    phone: nullableStr(row.phone),
    disease_name: nullableStr(row.disease_name),
    disease_category: nullableStr(row.disease_category),
    fee_amount: nullableNum(row.fee_amount),
    consultation_status: str(row.consultation_status, "신규"),
    created_at: str(row.created_at, new Date().toISOString()),
    referral_source: nullableStr(row.referral_source),
    referrer: nullableStr(row.referrer),
    notes: nullableStr(row.notes),
    pdf_url: nullableStr(row.pdf_url),
    has_weim: nullableBool(row.has_weim),
    docs_status: (row.docs_status as LeadDetail["docs_status"]) ?? null,
    referred_by_user_id: nullableStr(row.referred_by_user_id),
    assigned_to: nullableStr(row.assigned_to),
  };
}

/** Realtime UPDATE — 기존 enriched 행에 변경 필드만 병합 */
export function mergeLeadFromRealtime(
  existing: LeadDetail,
  row: RealtimeLeadRow,
): LeadDetail {
  return {
    ...existing,
    customer_name: row.customer_name != null ? str(row.customer_name, existing.customer_name) : existing.customer_name,
    phone: row.phone !== undefined ? nullableStr(row.phone) : existing.phone,
    disease_name: row.disease_name !== undefined ? nullableStr(row.disease_name) : existing.disease_name,
    disease_category:
      row.disease_category !== undefined
        ? nullableStr(row.disease_category)
        : existing.disease_category,
    fee_amount:
      row.fee_amount !== undefined ? nullableNum(row.fee_amount) : existing.fee_amount,
    consultation_status:
      row.consultation_status != null
        ? str(row.consultation_status, existing.consultation_status)
        : existing.consultation_status,
    referral_source:
      row.referral_source !== undefined ? nullableStr(row.referral_source) : existing.referral_source,
    referrer: row.referrer !== undefined ? nullableStr(row.referrer) : existing.referrer,
    notes: row.notes !== undefined ? nullableStr(row.notes) : existing.notes,
    pdf_url: row.pdf_url !== undefined ? nullableStr(row.pdf_url) : existing.pdf_url,
    has_weim: row.has_weim !== undefined ? nullableBool(row.has_weim) : existing.has_weim,
    docs_status:
      row.docs_status !== undefined
        ? ((row.docs_status as LeadDetail["docs_status"]) ?? null)
        : existing.docs_status,
    referred_by_user_id:
      row.referred_by_user_id !== undefined
        ? nullableStr(row.referred_by_user_id)
        : existing.referred_by_user_id,
    assigned_to: row.assigned_to !== undefined ? nullableStr(row.assigned_to) : existing.assigned_to,
    created_at: row.created_at != null ? str(row.created_at, existing.created_at) : existing.created_at,
  };
}

export function leadMatchesAssignedFilter(
  lead: Pick<LeadDetail, "assigned_to">,
  assignedTo?: string,
): boolean {
  if (!assignedTo) return true;
  return lead.assigned_to === assignedTo;
}
