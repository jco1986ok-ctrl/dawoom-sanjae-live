export type WeimCustomerInfoInput = {
  residentNumberFront: string;
  residentNumberBack: string;
  address: string;
  consentPersonalInfo: boolean;
  consentUniqueId: boolean;
};

function upsertNoteLine(notes: string | null, label: string, value: string | null): string {
  const lines = (notes ?? "").split("\n");
  const prefix = `[${label}]`;
  const kept = lines.filter((line) => !line.trim().startsWith(prefix));
  if (value?.trim()) {
    kept.push(`${prefix} ${value.trim()}`);
  }
  return kept.join("\n").trim();
}

export function validateWeimCustomerInfo(
  info: WeimCustomerInfoInput,
): { ok: true } | { ok: false; error: string } {
  const front = info.residentNumberFront.replace(/\D/g, "");
  const back = info.residentNumberBack.replace(/\D/g, "");
  const address = info.address.trim();

  if (front.length !== 6) {
    return { ok: false, error: "주민등록번호 앞 6자리를 입력해 주세요." };
  }
  if (back.length !== 7) {
    return { ok: false, error: "주민등록번호 뒤 7자리를 입력해 주세요." };
  }
  if (address.length < 2) {
    return { ok: false, error: "주소를 입력해 주세요." };
  }
  if (!info.consentPersonalInfo) {
    return { ok: false, error: "개인정보 수집·이용에 동의해 주세요." };
  }
  if (!info.consentUniqueId) {
    return { ok: false, error: "고유식별정보(주민등록번호) 처리에 동의해 주세요." };
  }

  return { ok: true };
}

/** leads.notes에 주소·주민번호(마스킹)·동의 정보 반영 */
export function mergeWeimCustomerInfoIntoNotes(
  notes: string | null,
  info: WeimCustomerInfoInput,
): string {
  const front = info.residentNumberFront.replace(/\D/g, "");
  const back = info.residentNumberBack.replace(/\D/g, "");
  const maskedRrn = `${front}-${back.slice(0, 1)}${"•".repeat(6)}`;

  let merged = upsertNoteLine(notes, "주소", info.address.trim());
  merged = upsertNoteLine(merged, "주민등록번호", maskedRrn);
  merged = upsertNoteLine(
    merged,
    "개인정보 동의",
    info.consentPersonalInfo ? "동의함" : null,
  );
  merged = upsertNoteLine(
    merged,
    "고유식별정보 동의",
    info.consentUniqueId ? "동의함" : null,
  );

  return merged;
}
