import { normalizePartnerName } from "@/lib/referral-resolve";

export const NATURAL_INFLOW = "자연유입";

/** OG·referrer 컬럼용 — 파트너 실명 대신 노출 */
export const FALLBACK_REFERRER_DISPLAY = "파로스 노무법인 전문가";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

/** ?ref= 우선(에이전트 코드). ?name= 레거시는 실명 대신 fallback. 없으면 자연유입 */
export function captureReferrerFromSearchParams(params: SearchParamsLike): string {
  const ref = params.get("ref")?.trim();
  if (ref) return ref;

  if (normalizePartnerName(params.get("name"))) {
    return FALLBACK_REFERRER_DISPLAY;
  }

  return NATURAL_INFLOW;
}

export function resolveReferrerForInsert(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : NATURAL_INFLOW;
}

export function displayReferrer(lead: {
  referrer?: string | null;
  partner_name?: string | null;
}): string {
  const stored = lead.referrer?.trim();
  if (stored) return stored;

  const partner = lead.partner_name?.trim();
  if (partner) return partner;

  return NATURAL_INFLOW;
}

export function isNaturalInflow(referrer: string): boolean {
  return referrer === NATURAL_INFLOW;
}
