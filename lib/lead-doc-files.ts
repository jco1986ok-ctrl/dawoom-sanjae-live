import {
  deriveLeadDocsStatus,
  type LeadDocsStatus,
  EMPTY_DOCS_STATUS,
} from "@/lib/lead-docs-status";
import { mimeTypeFromFileName } from "@/lib/lead-doc-upload";

export type LeadDocKey = keyof LeadDocsStatus;

export const LEAD_DOC_KEYS: LeadDocKey[] = [
  "mandateContract",
  "diagnosisReport",
  "employmentDocs",
  "qualificationHistory",
  "careBenefits10y",
  "employmentAccidentHistory",
  "incomeCertificate",
];

export const DOC_KEY_LABELS: Record<LeadDocKey, string> = {
  mandateContract: "위임장_약정서",
  diagnosisReport: "진단서",
  employmentDocs: "회사서류",
  qualificationHistory: "자격득실확인서",
  careBenefits10y: "요양급여_10년",
  employmentAccidentHistory: "고용산재_가입이력",
  incomeCertificate: "소득증명원",
};

export interface DocFileMeta {
  storagePath: string;
  fileName: string;
  mimeType: string;
}

/** docKey별 파일 메타 배열 (다중 업로드) */
export type LeadDocFilesMap = Partial<Record<LeadDocKey, DocFileMeta[]>>;

type StoredFileEntry = {
  path?: string;
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
};

function isLeadDocKey(key: string): key is LeadDocKey {
  return key in EMPTY_DOCS_STATUS;
}

export { isLeadDocKey };

function guessMimeType(path: string, explicit?: string, fileName?: string): string {
  if (explicit) return explicit;
  if (fileName) {
    const fromName = mimeTypeFromFileName(fileName);
    if (fromName) return fromName;
  }
  const fromPath = mimeTypeFromFileName(path);
  if (fromPath) return fromPath;
  return "application/octet-stream";
}

function guessExtension(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function parseStoredFileEntry(entry: unknown): DocFileMeta | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as StoredFileEntry;
  const storagePath = e.path ?? e.storagePath;
  if (!storagePath || typeof storagePath !== "string") return null;
  const mimeType = guessMimeType(storagePath, e.mimeType, e.fileName);
  const ext = guessExtension(mimeType);
  return {
    storagePath,
    fileName: e.fileName ?? `서류.${ext}`,
    mimeType,
  };
}

export function getDocFileList(
  files: LeadDocFilesMap,
  key: LeadDocKey,
): DocFileMeta[] {
  return files[key] ?? [];
}

export function getPrimaryDocFile(
  files: LeadDocFilesMap,
  key: LeadDocKey,
): DocFileMeta | undefined {
  return files[key]?.[0];
}

function parseStoredFiles(raw: unknown): LeadDocFilesMap {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const filesRaw = (o.files ?? o.urls ?? o.fileUrls) as Record<string, unknown> | undefined;
  if (!filesRaw || typeof filesRaw !== "object") return {};

  const out: LeadDocFilesMap = {};
  for (const [key, entry] of Object.entries(filesRaw)) {
    if (!isLeadDocKey(key) || entry == null) continue;
    if (Array.isArray(entry)) {
      const list = entry
        .map((item) => parseStoredFileEntry(item))
        .filter((item): item is DocFileMeta => item !== null);
      if (list.length > 0) out[key] = list;
      continue;
    }
    const single = parseStoredFileEntry(entry);
    if (single) out[key] = [single];
  }
  return out;
}

/** leads.docs_status JSON · pdf_url 기반 실제 파일 메타 */
export function deriveLeadDocFiles(lead: {
  pdf_url?: string | null;
  has_weim?: boolean | null;
  docs_status?: unknown;
  customer_name?: string | null;
}): LeadDocFilesMap {
  const status = deriveLeadDocsStatus(lead);
  const fromJson = parseStoredFiles(lead.docs_status);
  const files: LeadDocFilesMap = { ...fromJson };

  const safeName = String(lead.customer_name ?? "고객").replace(/[^\w가-힣.-]/g, "_");

  if (status.mandateContract && lead.pdf_url) {
    files.mandateContract = [
      {
        storagePath: lead.pdf_url,
        fileName: `${safeName}_위임장_계약서.pdf`,
        mimeType: "application/pdf",
      },
    ];
  }

  return files;
}

export function docHasStoredFile(
  key: LeadDocKey,
  status: LeadDocsStatus,
  files: LeadDocFilesMap,
): boolean {
  return Boolean(status[key] && (files[key]?.length ?? 0) > 0);
}

export function getDownloadableDocKeys(
  status: LeadDocsStatus,
  files: LeadDocFilesMap,
): LeadDocKey[] {
  return LEAD_DOC_KEYS.filter((key) => docHasStoredFile(key, status, files));
}

/** 수집 완료로 표시된 서류 (파일 유무 무관) */
export function getCollectedDocKeys(status: LeadDocsStatus): LeadDocKey[] {
  return LEAD_DOC_KEYS.filter((key) => status[key]);
}

export function buildDocPreviewUrl(
  leadId: string,
  docKey: LeadDocKey,
  index = 0,
): string {
  const q = index > 0 ? `&index=${index}` : "";
  return `/api/leads/${leadId}/documents/${docKey}?mode=inline${q}`;
}

export function buildDocDownloadUrl(
  leadId: string,
  docKey: LeadDocKey,
  index = 0,
): string {
  const q = index > 0 ? `&index=${index}` : "";
  return `/api/leads/${leadId}/documents/${docKey}?mode=attachment${q}`;
}

export function buildBulkZipUrl(leadId: string): string {
  return `/api/leads/${leadId}/documents/zip`;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
