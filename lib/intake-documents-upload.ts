import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocCategory, DocSlotId } from "@/lib/document-collection-catalog";
import type { LeadDocKey } from "@/lib/lead-doc-files";
import {
  buildDocsStatusAfterUpload,
  buildLeadDocStoragePath,
  resolveUploadMimeType,
  sanitizeUploadFileName,
  validateUploadFile,
} from "@/lib/lead-doc-upload";
import { buildOtherDocStoragePath, parseOtherDocs, type OtherDocEntry } from "@/lib/lead-other-docs";

/** Supabase Storage 버킷 (프로젝트: documents / pharos_documents 별칭) */
export const LEADS_DOCUMENTS_BUCKET =
  process.env.LEADS_DOCUMENTS_BUCKET?.trim() || "documents";

export type IntakeUploadTarget = {
  slotId: DocSlotId;
  leadDocKey?: LeadDocKey;
  category: DocCategory;
};

export type IntakeUploadedFile = {
  fileName: string;
  storagePath: string;
  slotId: DocSlotId;
};

export async function uploadIntakeDocumentToLead(
  supabase: SupabaseClient,
  leadId: string,
  file: File,
  target: IntakeUploadTarget,
): Promise<{ uploaded: IntakeUploadedFile; error?: string }> {
  const validationError = validateUploadFile(file);
  if (validationError) {
    return { uploaded: { fileName: file.name, storagePath: "", slotId: target.slotId }, error: validationError };
  }

  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("docs_status, other_docs")
    .eq("id", leadId)
    .maybeSingle();

  if (loadError || !lead) {
    return {
      uploaded: { fileName: file.name, storagePath: "", slotId: target.slotId },
      error: "고객 데이터를 찾을 수 없습니다.",
    };
  }

  const mimeType = resolveUploadMimeType(file);
  const displayName = sanitizeUploadFileName(file.name);
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  let docsStatus = lead.docs_status ?? {};
  let otherEntries: OtherDocEntry[] = [...parseOtherDocs(lead.other_docs)];

  const storagePath = target.leadDocKey
    ? buildLeadDocStoragePath(leadId, target.leadDocKey, file.name)
    : buildOtherDocStoragePath(leadId, `${target.slotId}_${file.name}`);

  const { error: uploadError } = await supabase.storage
    .from(LEADS_DOCUMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: Boolean(target.leadDocKey),
    });

  if (uploadError) {
    return {
      uploaded: { fileName: displayName, storagePath: "", slotId: target.slotId },
      error: `${file.name} 업로드 실패: ${uploadError.message}`,
    };
  }

  const fileMeta = { storagePath, fileName: displayName, mimeType };

  if (target.leadDocKey) {
    docsStatus = buildDocsStatusAfterUpload(docsStatus, target.leadDocKey, fileMeta);
  }

  otherEntries = otherEntries.filter((entry) => entry.slotId !== target.slotId);
  otherEntries.push({
    ...fileMeta,
    slotId: target.slotId,
    category: target.category,
    uploadedAt: new Date().toISOString(),
  });

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      other_docs: otherEntries,
      docs_status: docsStatus,
    })
    .eq("id", leadId);

  if (updateError) {
    return {
      uploaded: { fileName: displayName, storagePath, slotId: target.slotId },
      error: `서류 정보 저장 실패: ${updateError.message}`,
    };
  }

  return {
    uploaded: { fileName: displayName, storagePath, slotId: target.slotId },
  };
}

/** @deprecated — 슬롯 없이 일괄 업로드 (하위 호환) */
export async function appendIntakeDocumentsToLead(
  supabase: SupabaseClient,
  leadId: string,
  files: File[],
): Promise<{ uploaded: IntakeUploadedFile[]; error?: string }> {
  const uploaded: IntakeUploadedFile[] = [];
  for (const file of files) {
    const result = await uploadIntakeDocumentToLead(supabase, leadId, file, {
      slotId: "diagnosisReport",
      leadDocKey: "diagnosisReport",
      category: "medical",
    });
    if (result.error) {
      return { uploaded, error: result.error };
    }
    uploaded.push(result.uploaded);
  }
  return { uploaded };
}
