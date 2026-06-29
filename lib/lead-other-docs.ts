import type { DocCategory, DocSlotId } from "@/lib/document-collection-catalog";
import { mimeTypeFromFileName, sanitizeStorageObjectKey } from "@/lib/lead-doc-upload";

export interface OtherDocEntry {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  uploadedAt?: string;
  slotId?: DocSlotId;
  category?: DocCategory;
}

export function parseOtherDocs(raw: unknown): OtherDocEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => parseOtherDocEntry(item))
      .filter((e): e is OtherDocEntry => e !== null);
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const files = o.files ?? o.urls;
    if (Array.isArray(files)) {
      return files
        .map((item) => parseOtherDocEntry(item))
        .filter((e): e is OtherDocEntry => e !== null);
    }
  }
  return [];
}

function parseOtherDocEntry(item: unknown): OtherDocEntry | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const storagePath =
    (typeof o.storagePath === "string" && o.storagePath) ||
    (typeof o.path === "string" && o.path) ||
    (typeof o.url === "string" && o.url) ||
    null;
  if (!storagePath) return null;
  const fileName =
    typeof o.fileName === "string" && o.fileName.trim()
      ? o.fileName.trim()
      : storagePath.split("/").pop() ?? "기타서류";
  const mimeType =
    typeof o.mimeType === "string" && o.mimeType
      ? o.mimeType
      : guessMimeFromName(fileName);
  const uploadedAt =
    typeof o.uploadedAt === "string" ? o.uploadedAt : undefined;
  const slotId =
    typeof o.slotId === "string" ? (o.slotId as DocSlotId) : undefined;
  const category =
    o.category === "medical" ||
    o.category === "personal" ||
    o.category === "institution" ||
    o.category === "other"
      ? o.category
      : undefined;
  const fileSize = typeof o.fileSize === "number" && o.fileSize > 0 ? o.fileSize : undefined;
  return { storagePath, fileName, mimeType, uploadedAt, slotId, category, fileSize };
}

function guessMimeFromName(name: string): string {
  return mimeTypeFromFileName(name) ?? "application/octet-stream";
}

export function buildOtherDocStoragePath(leadId: string, originalFileName: string): string {
  const safeName = sanitizeStorageObjectKey(originalFileName);
  return `${leadId}/other_${safeName}`;
}

export function buildCategoryDocStoragePath(
  leadId: string,
  category: DocCategory,
  originalFileName: string,
): string {
  const safeName = sanitizeStorageObjectKey(originalFileName);
  return `${leadId}/cat_${category}_${safeName}`;
}

export function buildOtherDocPreviewUrl(leadId: string, index: number): string {
  return `/api/leads/${leadId}/documents/other/${index}?mode=inline`;
}

export function buildOtherDocDownloadUrl(leadId: string, index: number): string {
  return `/api/leads/${leadId}/documents/other/${index}?mode=attachment`;
}

export function getOtherDocsForSlot(
  otherDocs: OtherDocEntry[],
  slotId: DocSlotId,
): OtherDocEntry[] {
  return otherDocs.filter((doc) => doc.slotId === slotId);
}
