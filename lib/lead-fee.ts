import type { LeadDetail } from "@/lib/lead-detail";

const SUCCESS_FEE_RATE = 0.25;

/** notes 내 [예상 보상금] 파싱 (만원·억 단위 포함) */
function parseExpectedCompensationFromNotes(notes: string | null | undefined): number | null {
  if (!notes) return null;
  for (const line of notes.split("\n")) {
    const m = line.match(/^\[예상 보상금\]\s*(.+)$/);
    if (!m) continue;
    const raw = m[1].replace(/,/g, "").trim();
    const eok = raw.match(/([\d.]+)\s*억/);
    if (eok) return Math.round(parseFloat(eok[1]) * 100_000_000);
    const man = raw.match(/([\d.]+)\s*만\s*원?/);
    if (man) return Math.round(parseFloat(man[1]) * 10_000);
    const digits = raw.match(/([\d]+)\s*원?/);
    if (digits) return parseInt(digits[1], 10);
  }
  return null;
}

/** 건별 예상 수임료 — DB fee_amount 우선, 없으면 보상금×25% 추정 */
export function resolveLeadFeeAmount(
  lead: Pick<LeadDetail, "fee_amount" | "notes">,
): number {
  const stored = lead.fee_amount;
  if (stored != null && Number(stored) > 0) return Number(stored);

  const compensation = parseExpectedCompensationFromNotes(lead.notes);
  if (compensation != null && compensation > 0) {
    return Math.round(compensation * SUCCESS_FEE_RATE);
  }

  return 0;
}

export function formatKrw(amount: number): string {
  if (amount <= 0) return "0원";
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000;
    return `${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억원`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}
