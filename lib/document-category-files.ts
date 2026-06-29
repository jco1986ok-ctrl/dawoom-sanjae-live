import {
  DOC_COLLECTION_SLOTS,
  type DocCategory,
} from "@/lib/document-collection-catalog";
import {
  buildDocPreviewUrl,
  getDocFileList,
  type LeadDocKey,
  type LeadDocFilesMap,
} from "@/lib/lead-doc-files";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import {
  buildOtherDocPreviewUrl,
  type OtherDocEntry,
} from "@/lib/lead-other-docs";

export type CategoryFileItem = {
  id: string;
  fileName: string;
  fileSize?: number;
  storagePath: string;
  previewUrl: string;
  kind: "standard" | "other";
  docKey?: LeadDocKey;
  fileIndex?: number;
};

const LEAD_DOC_KEY_CATEGORY = new Map<LeadDocKey, DocCategory>(
  DOC_COLLECTION_SLOTS.filter((slot) => slot.leadDocKey).map((slot) => [
    slot.leadDocKey!,
    slot.category,
  ]),
);

const SLOT_ID_CATEGORY = new Map(
  DOC_COLLECTION_SLOTS.map((slot) => [slot.id, slot.category]),
);

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function resolveOtherDocCategory(doc: OtherDocEntry): DocCategory {
  if (doc.category === "medical" || doc.category === "personal" || doc.category === "institution" || doc.category === "other") {
    return doc.category;
  }
  if (doc.slotId) {
    return SLOT_ID_CATEGORY.get(doc.slotId) ?? "other";
  }
  return "other";
}

/** 카테고리별 업로드·표시용 파일 목록 (레거시 슬롯·표준 키 포함) */
export function getCategoryFileItems(
  category: DocCategory,
  leadId: string,
  _docsStatus: LeadDocsStatus,
  docFiles: LeadDocFilesMap,
  otherDocs: OtherDocEntry[],
): CategoryFileItem[] {
  const items: CategoryFileItem[] = [];

  for (const [docKey, cat] of LEAD_DOC_KEY_CATEGORY) {
    if (cat !== category) continue;
    const files = getDocFileList(docFiles, docKey);
    files.forEach((meta, fileIndex) => {
      items.push({
        id: meta.storagePath,
        fileName: meta.fileName,
        storagePath: meta.storagePath,
        previewUrl: buildDocPreviewUrl(leadId, docKey, fileIndex),
        kind: "standard",
        docKey,
        fileIndex,
      });
    });
  }

  otherDocs.forEach((entry, index) => {
    if (resolveOtherDocCategory(entry) !== category) return;
    items.push({
      id: entry.storagePath,
      fileName: entry.fileName,
      fileSize: entry.fileSize,
      storagePath: entry.storagePath,
      previewUrl: buildOtherDocPreviewUrl(leadId, index),
      kind: "other",
    });
  });

  return items;
}

export function countCategoryFiles(
  category: DocCategory,
  docsStatus: LeadDocsStatus,
  docFiles: LeadDocFilesMap,
  otherDocs: OtherDocEntry[],
): number {
  return getCategoryFileItems(category, "", docsStatus, docFiles, otherDocs).length;
}
