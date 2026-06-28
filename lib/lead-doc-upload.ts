import type { LeadDocKey } from "@/lib/lead-doc-files";
import type { DocFileMeta } from "@/lib/lead-doc-files";

export const MAX_DOC_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
]);

/** 파일명 끝 확장자 추출 — 한글·영문 파일명 공통 (예: 건강검진.pdf, report.PDF) */
export function extractFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim();
  const match = trimmed.match(/\.([a-zA-Z0-9]{1,8})$/);
  return match ? match[1].toLowerCase() : null;
}

/** 확장자 → MIME (한글/영문 파일명 모두 파일명 끝 확장자로 판별) */
export function mimeTypeFromFileName(fileName: string): string | null {
  const ext = extractFileExtension(fileName);
  if (!ext) return null;
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
    case "heif":
      return "image/heic";
    case "bmp":
      return "image/bmp";
    case "tif":
    case "tiff":
      return "image/tiff";
    default:
      return null;
  }
}

export function isAllowedUploadFileName(fileName: string): boolean {
  return mimeTypeFromFileName(fileName) !== null;
}

const MANUAL_UPLOAD_KEYS: LeadDocKey[] = [
  "diagnosisReport",
  "employmentDocs",
  "qualificationHistory",
  "careBenefits10y",
  "employmentAccidentHistory",
  "incomeCertificate",
];

export function isManualUploadDocKey(key: string): key is LeadDocKey {
  return (MANUAL_UPLOAD_KEYS as string[]).includes(key);
}

/** UI·DB 표시용 — 원본에 가깝게 (슬래시만 제거) */
export function sanitizeUploadFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").trim();
  return base.length > 0 ? base.slice(0, 120) : "upload.bin";
}

/** Supabase Storage isValidKey — ASCII \w, /, and limited punctuation only (한글 불가) */
const SUPABASE_STORAGE_KEY_RE =
  /^(\w|\/|!|-|\.|\*|'|\(|\)| |&|\$|@|=|;|:|\+|,|\?)*$/;

export function isValidSupabaseStorageKey(key: string): boolean {
  return key.length > 0 && key.length < 1024 && SUPABASE_STORAGE_KEY_RE.test(key);
}

/** Storage 경로용 — ASCII-only (원본 한글·영문명은 DB fileName에 저장) */
export function sanitizeStorageObjectKey(name: string): string {
  const extFromName = extractFileExtension(name);
  const ext = (extFromName ?? "bin").replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";

  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const candidate = `doc_${stamp}_${rand}.${ext}`;

  if (isValidSupabaseStorageKey(candidate)) return candidate;
  return `doc_${stamp}.${ext}`;
}

export function buildLeadDocStoragePath(
  leadId: string,
  docKey: LeadDocKey,
  _originalFileName: string,
): string {
  const safeName = sanitizeStorageObjectKey(_originalFileName);
  return `${leadId}/${docKey}_${safeName}`;
}

function readStoredFileList(
  prevFiles: Record<string, unknown>,
  docKey: LeadDocKey,
): DocFileMeta[] {
  const entry = prevFiles[docKey];
  if (Array.isArray(entry)) {
    return entry
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const storagePath =
          (typeof o.path === "string" && o.path) ||
          (typeof o.storagePath === "string" && o.storagePath) ||
          null;
        if (!storagePath) return null;
        return {
          storagePath,
          fileName:
            typeof o.fileName === "string" && o.fileName.trim()
              ? o.fileName.trim()
              : storagePath.split("/").pop() ?? "upload.bin",
          mimeType:
            typeof o.mimeType === "string" && o.mimeType
              ? o.mimeType
              : "application/octet-stream",
        } satisfies DocFileMeta;
      })
      .filter((item): item is DocFileMeta => item !== null);
  }
  if (entry && typeof entry === "object") {
    const o = entry as Record<string, unknown>;
    const storagePath =
      (typeof o.path === "string" && o.path) ||
      (typeof o.storagePath === "string" && o.storagePath) ||
      null;
    if (!storagePath) return [];
    return [
      {
        storagePath,
        fileName:
          typeof o.fileName === "string" && o.fileName.trim()
            ? o.fileName.trim()
            : storagePath.split("/").pop() ?? "upload.bin",
        mimeType:
          typeof o.mimeType === "string" && o.mimeType
            ? o.mimeType
            : "application/octet-stream",
      },
    ];
  }
  return [];
}

function serializeFileList(metas: DocFileMeta[]): Record<string, string>[] {
  return metas.map((meta) => ({
    path: meta.storagePath,
    fileName: meta.fileName,
    mimeType: meta.mimeType,
  }));
}

export function buildDocsStatusAfterUpload(
  prevRaw: unknown,
  docKey: LeadDocKey,
  fileMeta: DocFileMeta | DocFileMeta[],
): Record<string, unknown> {
  const prev =
    prevRaw && typeof prevRaw === "object"
      ? { ...(prevRaw as Record<string, unknown>) }
      : {};

  const prevFiles =
    prev.files && typeof prev.files === "object"
      ? { ...(prev.files as Record<string, unknown>) }
      : {};

  const incoming = Array.isArray(fileMeta) ? fileMeta : [fileMeta];
  const merged = [...readStoredFileList(prevFiles, docKey), ...incoming];
  prevFiles[docKey] = serializeFileList(merged);
  prev.files = prevFiles;
  prev[docKey] = merged.length > 0;
  return prev;
}

export function buildDocsStatusAfterRemove(
  prevRaw: unknown,
  docKey: LeadDocKey,
  storagePath: string,
): Record<string, unknown> {
  const prev =
    prevRaw && typeof prevRaw === "object"
      ? { ...(prevRaw as Record<string, unknown>) }
      : {};

  const prevFiles =
    prev.files && typeof prev.files === "object"
      ? { ...(prev.files as Record<string, unknown>) }
      : {};

  const remaining = readStoredFileList(prevFiles, docKey).filter(
    (meta) => meta.storagePath !== storagePath,
  );

  if (remaining.length === 0) {
    delete prevFiles[docKey];
    prev[docKey] = false;
  } else {
    prevFiles[docKey] = serializeFileList(remaining);
    prev[docKey] = true;
  }

  prev.files = prevFiles;
  return prev;
}

export function resolveUploadMimeType(file: File): string {
  const fromType = file.type?.trim();
  if (fromType && fromType !== "application/octet-stream") return fromType;
  return mimeTypeFromFileName(file.name) ?? fromType ?? "application/octet-stream";
}

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_DOC_UPLOAD_BYTES) {
    return "파일 용량은 50MB 이하여야 합니다.";
  }
  const mime = resolveUploadMimeType(file);
  if (ALLOWED_DOC_MIME.has(mime) || mime.startsWith("image/")) {
    return null;
  }
  if (isAllowedUploadFileName(file.name)) {
    return null;
  }
  return "PDF 또는 이미지 파일만 업로드할 수 있습니다. (pdf, jpg, png, webp 등)";
}
