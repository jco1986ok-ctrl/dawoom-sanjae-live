import type { DocCategory, DocSlotId } from "@/lib/document-collection-catalog";
import type { LeadDocKey } from "@/lib/lead-doc-files";
import { resolveWizardUploadTargets } from "@/lib/document-collection-catalog";

export type IntakeDocUploadResult = {
  success: boolean;
  uploaded?: { fileName: string; storagePath: string; slotId?: DocSlotId }[];
  error?: string;
};

type IntakeUploadPayload = {
  slotId: DocSlotId;
  leadDocKey?: LeadDocKey;
  category: DocCategory;
};

async function postIntakeFile(
  leadId: string,
  token: string,
  file: File,
  target: IntakeUploadPayload,
): Promise<IntakeDocUploadResult> {
  const fd = new FormData();
  fd.append("leadId", leadId);
  fd.append("token", token);
  fd.append("file", file);
  fd.append("slotId", target.slotId);
  fd.append("category", target.category);
  if (target.leadDocKey) fd.append("leadDocKey", target.leadDocKey);

  const res = await fetch("/api/leads/intake-documents", {
    method: "POST",
    body: fd,
  });

  const data = (await res.json().catch(() => ({}))) as IntakeDocUploadResult;
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error ?? `${file.name} 업로드에 실패했습니다.`,
      uploaded: data.uploaded,
    };
  }
  return data;
}

/** 접수 완료 위저드 — 단일/다중 파일 업로드 */
export async function uploadIntakeWizardFiles(
  leadId: string,
  token: string,
  wizardStep: 1 | 2 | 3,
  files: File[],
): Promise<IntakeDocUploadResult> {
  if (!leadId || !token) {
    return { success: false, error: "접수 정보가 없어 서류를 첨부할 수 없습니다." };
  }
  if (files.length === 0) {
    return { success: false, error: "업로드할 파일을 선택해 주세요." };
  }

  const targets = resolveWizardUploadTargets(wizardStep, files.length);
  const uploaded: { fileName: string; storagePath: string; slotId?: DocSlotId }[] = [];

  for (let i = 0; i < files.length; i += 1) {
    const target = targets[i];
    const result = await postIntakeFile(leadId, token, files[i], target);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        uploaded: uploaded.length > 0 ? uploaded : undefined,
      };
    }
    if (result.uploaded?.[0]) uploaded.push(result.uploaded[0]);
  }

  return { success: true, uploaded };
}

/** 단일 슬롯 업로드 (관리자·레거시 호환) */
export async function uploadIntakeDocuments(
  leadId: string,
  token: string,
  files: File[],
  wizardStep: 1 | 2 | 3 = 2,
): Promise<IntakeDocUploadResult> {
  return uploadIntakeWizardFiles(leadId, token, wizardStep, files);
}
