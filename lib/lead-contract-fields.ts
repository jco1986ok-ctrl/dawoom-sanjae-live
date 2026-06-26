import { buildContractPdfFields } from "@/lib/contract-pdf";
import { parseSurveyFieldMap } from "@/lib/lead-survey-report";

export type LeadContractFormData = {
  name: string;
  phone: string;
  address: string;
  addressBase: string;
  addressDetail: string;
  zonecode: string;
  residentNumberFront: string;
  residentNumberBack: string;
};

export function leadHasWeimSigned(lead: {
  has_weim?: boolean | null;
  pdf_url?: string | null;
}): boolean {
  return Boolean(lead.has_weim || lead.pdf_url);
}

/** notes에서 주민등록번호 추출 — 마스킹(•)된 경우 null */
export function parseResidentFromNotes(notes: string | null): {
  front: string;
  back: string;
} | null {
  if (!notes?.trim()) return null;

  const map = parseSurveyFieldMap(notes);
  const fromField = map["주민등록번호"];
  if (fromField) {
    const full = fromField.match(/(\d{6})-(\d{7})/);
    if (full) return { front: full[1], back: full[2] };
    if (/[•*]/.test(fromField)) return null;
  }

  const anywhere = notes.match(/\b(\d{6})-(\d{7})\b/);
  if (anywhere) return { front: anywhere[1], back: anywhere[2] };

  return null;
}

function splitAddress(address: string): { addressBase: string; addressDetail: string } {
  const trimmed = address.trim();
  if (!trimmed) return { addressBase: "", addressDetail: "" };

  const comma = trimmed.indexOf(",");
  if (comma > 0) {
    return {
      addressBase: trimmed.slice(0, comma).trim(),
      addressDetail: trimmed.slice(comma + 1).trim(),
    };
  }

  const space = trimmed.lastIndexOf(" ");
  if (space > 8) {
    return {
      addressBase: trimmed.slice(0, space).trim(),
      addressDetail: trimmed.slice(space + 1).trim(),
    };
  }

  return { addressBase: trimmed, addressDetail: "" };
}

export type WeimSignMissingInfo = {
  residentNumber: boolean;
  address: boolean;
  consent: boolean;
};

export function getWeimSignMissingInfo(notes: string | null): WeimSignMissingInfo {
  const fields = parseSurveyFieldMap(notes);
  const resident = parseResidentFromNotes(notes);
  const address = fields["주소"]?.trim() ?? "";
  const hasPersonalConsent = fields["개인정보 동의"] === "동의함";
  const hasUniqueConsent = fields["고유식별정보 동의"] === "동의함";

  return {
    residentNumber: !resident,
    address: !address,
    consent: !hasPersonalConsent || !hasUniqueConsent,
  };
}

export function getWeimSignPrefill(notes: string | null): { address?: string } {
  const fields = parseSurveyFieldMap(notes);
  const address = fields["주소"]?.trim();
  return address ? { address } : {};
}

export type LeadContractFormOverrides = Partial<
  Pick<
    LeadContractFormData,
    | "address"
    | "addressBase"
    | "addressDetail"
    | "zonecode"
    | "residentNumberFront"
    | "residentNumberBack"
  >
>;

/** 기존 leads 행 → 위임장 PDF 생성용 formData */
export function buildContractFormDataFromLead(
  lead: {
    customer_name: string;
    phone: string | null;
    notes: string | null;
  },
  overrides?: LeadContractFormOverrides,
): { ok: true; formData: LeadContractFormData } | { ok: false; error: string } {
  const name = lead.customer_name?.trim();
  const phone = lead.phone?.trim();

  if (!name) {
    return { ok: false, error: "고객 이름 정보가 없습니다. 담당자에게 문의해 주세요." };
  }
  if (!phone) {
    return { ok: false, error: "연락처 정보가 없습니다. 담당자에게 문의해 주세요." };
  }

  const fields = parseSurveyFieldMap(lead.notes);
  const address = overrides?.address?.trim() || fields["주소"]?.trim() || "";
  const { addressBase, addressDetail } = overrides?.addressBase
    ? {
        addressBase: overrides.addressBase.trim(),
        addressDetail: overrides.addressDetail?.trim() ?? "",
      }
    : splitAddress(address);
  const resident =
    overrides?.residentNumberFront && overrides?.residentNumberBack
      ? {
          front: overrides.residentNumberFront.replace(/\D/g, ""),
          back: overrides.residentNumberBack.replace(/\D/g, ""),
        }
      : parseResidentFromNotes(lead.notes);

  if (!resident) {
    return {
      ok: false,
      error:
        "위임장 작성에 필요한 주민등록번호 정보가 없습니다. 담당자에게 문의해 주세요.",
    };
  }

  if (!address) {
    return {
      ok: false,
      error: "위임장 작성에 필요한 주소 정보가 없습니다. 담당자에게 문의해 주세요.",
    };
  }

  return {
    ok: true,
    formData: {
      name,
      phone,
      address,
      addressBase,
      addressDetail,
      zonecode: "",
      residentNumberFront: resident.front,
      residentNumberBack: resident.back,
    },
  };
}

export function buildPdfFieldsFromLead(
  lead: {
    customer_name: string;
    phone: string | null;
    notes: string | null;
  },
  overrides?: LeadContractFormOverrides,
):
  | { ok: true; formData: LeadContractFormData; pdfFields: ReturnType<typeof buildContractPdfFields> }
  | { ok: false; error: string } {
  const parsed = buildContractFormDataFromLead(lead, overrides);
  if (!parsed.ok) return parsed;

  const { formData } = parsed;
  return {
    ok: true as const,
    formData,
    pdfFields: buildContractPdfFields({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      addressBase: formData.addressBase,
      addressDetail: formData.addressDetail,
      zonecode: formData.zonecode,
      residentNumberFront: formData.residentNumberFront,
      residentNumberBack: formData.residentNumberBack,
    }),
  };
}
