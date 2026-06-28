import { createClient } from "@/lib/supabase/client";
import type { LeadDocKey, LeadDocFilesMap } from "@/lib/lead-doc-files";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import { buildOtherDocStoragePath } from "@/lib/lead-other-docs";
import {
  buildLeadDocStoragePath,
  resolveUploadMimeType,
  sanitizeUploadFileName,
  validateUploadFile,
} from "@/lib/lead-doc-upload";

export type StandardDocUploadResult = {
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  docs_status?: unknown;
};

export type OtherDocsUploadResult = {
  otherDocs: OtherDocEntry[];
};

type SignedUploadPayload = {
  signedUrl: string;
  token: string;
  path: string;
  storagePath: string;
  error?: string;
};

type FileMetaPayload = {
  storagePath: string;
  fileName: string;
  mimeType: string;
};

function formatUploadError(step: string, detail?: string): string {
  const msg = detail?.trim();
  if (!msg) return `${step}에 실패했습니다.`;
  if (/row-level security|RLS|403|401|Unauthorized|Forbidden/i.test(msg)) {
    return `${step} 권한 오류 — 다시 로그인 후 시도해 주세요. (${msg})`;
  }
  if (/mime|content type|invalid file type/i.test(msg)) {
    return `${step} — PDF 또는 JPG/PNG 이미지만 업로드할 수 있습니다. (${msg})`;
  }
  if (/payload too large|413|size/i.test(msg)) {
    return `${step} — 파일 용량은 50MB 이하여야 합니다. (${msg})`;
  }
  return `${step}: ${msg}`;
}

async function requestSignedUploadUrl(
  leadId: string,
  storagePath: string,
  upsert: boolean,
): Promise<SignedUploadPayload> {
  const res = await fetch(`/api/leads/${leadId}/documents/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath, upsert }),
  });
  const data = (await res.json().catch(() => ({}))) as SignedUploadPayload;
  if (!res.ok || !data.signedUrl || !data.token) {
    throw new Error(formatUploadError("업로드 준비", data.error));
  }
  return data;
}

/** Signed URL로 Storage 직접 PUT — RLS·MIME 이슈 우회 */
async function uploadFileViaSignedUrl(
  leadId: string,
  storagePath: string,
  file: File,
  upsert: boolean,
): Promise<void> {
  const mimeType = resolveUploadMimeType(file);
  const signed = await requestSignedUploadUrl(leadId, storagePath, upsert);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: mimeType,
      upsert,
    });

  if (uploadError) {
    console.error("[client-doc-upload signed]", uploadError);
    throw new Error(formatUploadError("파일 업로드", uploadError.message));
  }
}

async function syncDocumentMetadata(
  leadId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`/api/leads/${leadId}/documents/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildFileMeta(leadId: string, docKey: LeadDocKey, file: File): FileMetaPayload {
  const mimeType = resolveUploadMimeType(file);
  const displayName = sanitizeUploadFileName(file.name);
  const storagePath = buildLeadDocStoragePath(leadId, docKey, file.name);
  return { storagePath, fileName: displayName, mimeType };
}

async function uploadFilesToStorage(
  leadId: string,
  files: File[],
  resolvePath: (file: File) => string,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const storagePath = resolvePath(file);
      await uploadFileViaSignedUrl(leadId, storagePath, file, false);
    }),
  );
}

/** 클라이언트 → Supabase Storage 직접 업로드 (단일 파일) */
export async function uploadLeadDocumentDirect(
  leadId: string,
  docKey: LeadDocKey,
  file: File,
): Promise<StandardDocUploadResult> {
  return uploadLeadDocumentsDirect(leadId, docKey, [file]);
}

/** 클라이언트 → Supabase Storage 다중 직접 업로드 */
export async function uploadLeadDocumentsDirect(
  leadId: string,
  docKey: LeadDocKey,
  files: File[],
): Promise<StandardDocUploadResult> {
  if (files.length === 0) {
    throw new Error("업로드할 파일을 선택해 주세요.");
  }

  for (const file of files) {
    const validationError = validateUploadFile(file);
    if (validationError) {
      throw new Error(`${file.name}: ${validationError}`);
    }
  }

  const fileMetas = files.map((file) => buildFileMeta(leadId, docKey, file));

  await uploadFilesToStorage(leadId, files, (file) =>
    buildLeadDocStoragePath(leadId, docKey, file.name),
  );

  const res = await syncDocumentMetadata(leadId, {
    type: "standard",
    docKey,
    fileMetas,
  });

  const data = (await res.json().catch(() => ({}))) as StandardDocUploadResult & {
    error?: string;
  };

  if (!res.ok || !data.docsStatus) {
    throw new Error(formatUploadError("서류 정보 저장", data.error));
  }

  return data;
}

export async function deleteLeadDocumentFile(
  leadId: string,
  docKey: LeadDocKey,
  storagePath: string,
): Promise<StandardDocUploadResult> {
  const res = await syncDocumentMetadata(leadId, {
    type: "standard_remove",
    docKey,
    storagePath,
  });

  const data = (await res.json().catch(() => ({}))) as StandardDocUploadResult & {
    error?: string;
  };

  if (!res.ok || !data.docsStatus) {
    throw new Error(formatUploadError("서류 삭제", data.error));
  }

  return data;
}

/** 기타 서류 다중 직접 업로드 */
export async function uploadOtherDocsDirect(
  leadId: string,
  files: File[],
): Promise<OtherDocsUploadResult> {
  if (files.length === 0) {
    throw new Error("업로드할 파일을 선택해 주세요.");
  }

  const newEntries = await Promise.all(
    files.map(async (file) => {
      const validationError = validateUploadFile(file);
      if (validationError) {
        throw new Error(`${file.name}: ${validationError}`);
      }

      const mimeType = resolveUploadMimeType(file);
      const displayName = sanitizeUploadFileName(file.name);
      const storagePath = buildOtherDocStoragePath(leadId, file.name);

      await uploadFileViaSignedUrl(leadId, storagePath, file, false);

      return {
        storagePath,
        fileName: displayName,
        mimeType,
        uploadedAt: new Date().toISOString(),
      } satisfies OtherDocEntry;
    }),
  );

  const res = await syncDocumentMetadata(leadId, {
    type: "other",
    append: newEntries,
  });

  const data = (await res.json().catch(() => ({}))) as OtherDocsUploadResult & {
    error?: string;
  };

  if (!res.ok || !Array.isArray(data.otherDocs)) {
    throw new Error(formatUploadError("기타 서류 정보 저장", data.error));
  }

  return { otherDocs: data.otherDocs };
}

export async function deleteOtherDocumentFile(
  leadId: string,
  storagePath: string,
): Promise<OtherDocsUploadResult> {
  const res = await syncDocumentMetadata(leadId, {
    type: "other_remove",
    storagePath,
  });

  const data = (await res.json().catch(() => ({}))) as OtherDocsUploadResult & {
    error?: string;
  };

  if (!res.ok || !Array.isArray(data.otherDocs)) {
    throw new Error(formatUploadError("기타 서류 삭제", data.error));
  }

  return { otherDocs: data.otherDocs };
}

/** 슬롯 지정 서류 직접 업로드 (관리자, 단일) */
export async function uploadSlottedDocDirect(
  leadId: string,
  file: File,
  slotId: import("@/lib/document-collection-catalog").DocSlotId,
  category: import("@/lib/document-collection-catalog").DocCategory,
): Promise<OtherDocsUploadResult> {
  return uploadSlottedDocsDirect(leadId, [file], slotId, category);
}

/** 슬롯 지정 서류 다중 직접 업로드 (관리자) */
export async function uploadSlottedDocsDirect(
  leadId: string,
  files: File[],
  slotId: import("@/lib/document-collection-catalog").DocSlotId,
  category: import("@/lib/document-collection-catalog").DocCategory,
): Promise<OtherDocsUploadResult> {
  if (files.length === 0) {
    throw new Error("업로드할 파일을 선택해 주세요.");
  }

  const append = await Promise.all(
    files.map(async (file) => {
      const validationError = validateUploadFile(file);
      if (validationError) {
        throw new Error(`${file.name}: ${validationError}`);
      }

      const mimeType = resolveUploadMimeType(file);
      const displayName = sanitizeUploadFileName(file.name);
      const storagePath = buildOtherDocStoragePath(leadId, `${slotId}_${file.name}`);

      await uploadFileViaSignedUrl(leadId, storagePath, file, false);

      return {
        storagePath,
        fileName: displayName,
        mimeType,
        slotId,
        category,
        uploadedAt: new Date().toISOString(),
      } satisfies OtherDocEntry;
    }),
  );

  const res = await syncDocumentMetadata(leadId, {
    type: "other",
    append,
  });

  const data = (await res.json().catch(() => ({}))) as OtherDocsUploadResult & {
    error?: string;
  };

  if (!res.ok || !Array.isArray(data.otherDocs)) {
    throw new Error(formatUploadError("서류 정보 저장", data.error));
  }

  return { otherDocs: data.otherDocs };
}
