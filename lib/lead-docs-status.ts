import type { UserRole } from "@/lib/types";

/** 서류 매트릭스 UI 노출 허용 직책 (4종) */
export type DocsMatrixRole = "마스터" | "총괄" | "대표노무사" | "노무사";

export interface LeadDocsStatus {
  /** 위임장/약정서 (전자서명 PDF) */
  mandateContract: boolean;
  /** 진단서 — 필수, 미수집 시 강조 */
  diagnosisReport: boolean;
  /** 근로계약서/임금대장 */
  employmentDocs: boolean;
  /** 자격득실 확인서 */
  qualificationHistory: boolean;
  /** 요양급여 지급확인(10년) */
  careBenefits10y: boolean;
  /** 고용·산재보험 가입 이력 */
  employmentAccidentHistory: boolean;
  /** 소득증명원 */
  incomeCertificate: boolean;
}

export const EMPTY_DOCS_STATUS: LeadDocsStatus = {
  mandateContract: false,
  diagnosisReport: false,
  employmentDocs: false,
  qualificationHistory: false,
  careBenefits10y: false,
  employmentAccidentHistory: false,
  incomeCertificate: false,
};

function parseDocsStatusJson(raw: unknown): Partial<LeadDocsStatus> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const patch: Partial<LeadDocsStatus> = {};
  const keys: (keyof LeadDocsStatus)[] = [
    "mandateContract",
    "diagnosisReport",
    "employmentDocs",
    "qualificationHistory",
    "careBenefits10y",
    "employmentAccidentHistory",
    "incomeCertificate",
  ];
  for (const k of keys) {
    if (typeof o[k] === "boolean") patch[k] = o[k];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/** leads.docs_status JSON · pdf_url · has_weim 기반 파생 */
export function deriveLeadDocsStatus(lead: {
  pdf_url?: string | null;
  has_weim?: boolean | null;
  notes?: string | null;
  docs_status?: unknown;
}): LeadDocsStatus {
  const fromJson = parseDocsStatusJson(lead.docs_status);
  const mandateContract = Boolean(
    lead.has_weim || lead.pdf_url || fromJson?.mandateContract,
  );

  const base: LeadDocsStatus = {
    ...EMPTY_DOCS_STATUS,
    mandateContract,
  };

  if (fromJson) {
    return {
      ...base,
      ...fromJson,
      mandateContract,
    };
  }

  const notes = lead.notes ?? "";
  if (/\[서류:진단서\]/i.test(notes)) base.diagnosisReport = true;
  if (/\[서류:회사\]/i.test(notes)) base.employmentDocs = true;
  if (/\[서류:자격득실\]/i.test(notes)) base.qualificationHistory = true;
  if (/\[서류:요양10\]/i.test(notes)) base.careBenefits10y = true;
  if (/\[서류:고용산재\]/i.test(notes)) base.employmentAccidentHistory = true;
  if (/\[서류:소득증명\]/i.test(notes)) base.incomeCertificate = true;

  return base;
}

/** 로그인 직책 → 서류 매트릭스 RBAC (허용 4종만 true) */
export function normalizeDocsMatrixRole(role: string): DocsMatrixRole | null {
  switch (role) {
    case "마스터":
    case "관리자":
      return "마스터";
    case "총괄":
    case "총괄파트너":
    case "총괄공식파트너":
      return "총괄";
    case "대표노무사":
      return "대표노무사";
    case "노무사":
      return "노무사";
    default:
      return null;
  }
}

export function canViewDocumentsMatrix(role: string): boolean {
  return normalizeDocsMatrixRole(role) !== null;
}

export function userRoleCanViewDocumentsMatrix(role: UserRole | string): boolean {
  return canViewDocumentsMatrix(role);
}

export function canInteractWithDocumentsMatrix(role: string): boolean {
  return canViewDocumentsMatrix(role);
}

/** 마스터·총괄·대표노무사·노무사 — 서류 수동 첨부 */
export function canAdminManageLeadDocuments(role: string): boolean {
  const normalized = normalizeDocsMatrixRole(role);
  return (
    normalized === "마스터" ||
    normalized === "총괄" ||
    normalized === "대표노무사" ||
    normalized === "노무사"
  );
}

/** 서류 열람만 가능 (업로드 패널 없음) */
export function canViewLeadDocumentsReadOnly(role: string): boolean {
  return canViewDocumentsMatrix(role) && !canAdminManageLeadDocuments(role);
}

/** 서류 열람·미리보기·다운로드 (마스터·총괄·대표노무사·노무사) */
export function canViewLeadDocuments(role: string): boolean {
  return canViewDocumentsMatrix(role);
}

/** 노무사 대시보드 — 위임·계약서 PDF 다운로드 RBAC */
export function canDownloadContractPdf(role: string): boolean {
  return canViewDocumentsMatrix(role);
}
