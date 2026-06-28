import type { LeadDocKey } from "@/lib/lead-doc-files";
import { docHasStoredFile } from "@/lib/lead-doc-files";
import type { LeadDocFilesMap } from "@/lib/lead-doc-files";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import type { DiseaseCategory } from "@/lib/disease-category";
import { getMedicalSlotIdsForDisease } from "@/lib/disease-category";

export type DocCategory = "medical" | "personal" | "institution";

export type DocSlotId =
  | "diagnosisReport"
  | "initialChart"
  | "surgeryRecord"
  | "imagingReport"
  | "admissionDischarge"
  | "idCard"
  | "employmentContract"
  | "payroll"
  | "accidentStatement"
  | "sitePhoto"
  | "careBenefitsStatement"
  | "qualificationHistory"
  | "agencySubmission";

export type DocSlotDefinition = {
  id: DocSlotId;
  category: DocCategory;
  label: string;
  hint?: string;
  /** typed docs_status key when applicable */
  leadDocKey?: LeadDocKey;
  /** 고객 위저드에서 수집 대상 */
  customerCollectible: boolean;
  /** 파트너/노무사 전용 업로드 */
  institutionOnly?: boolean;
};

export const DOC_COLLECTION_SLOTS: DocSlotDefinition[] = [
  {
    id: "diagnosisReport",
    category: "medical",
    label: "진단서",
    leadDocKey: "diagnosisReport",
    customerCollectible: true,
  },
  {
    id: "initialChart",
    category: "medical",
    label: "초진기록지",
    customerCollectible: true,
  },
  {
    id: "surgeryRecord",
    category: "medical",
    label: "수술기록지",
    customerCollectible: true,
  },
  {
    id: "imagingReport",
    category: "medical",
    label: "영상판독지",
    customerCollectible: true,
  },
  {
    id: "admissionDischarge",
    category: "medical",
    label: "입·퇴원확인서",
    customerCollectible: true,
  },
  {
    id: "idCard",
    category: "personal",
    label: "신분증",
    customerCollectible: true,
  },
  {
    id: "employmentContract",
    category: "personal",
    label: "근로계약서",
    leadDocKey: "employmentDocs",
    customerCollectible: true,
  },
  {
    id: "payroll",
    category: "personal",
    label: "급여명세서",
    leadDocKey: "incomeCertificate",
    customerCollectible: true,
  },
  {
    id: "accidentStatement",
    category: "personal",
    label: "재해경위서",
    customerCollectible: true,
  },
  {
    id: "sitePhoto",
    category: "personal",
    label: "현장사진",
    customerCollectible: true,
  },
  {
    id: "careBenefitsStatement",
    category: "institution",
    label: "요양급여내역서",
    leadDocKey: "careBenefits10y",
    customerCollectible: false,
    institutionOnly: true,
  },
  {
    id: "qualificationHistory",
    category: "institution",
    label: "자격이력내역서",
    leadDocKey: "qualificationHistory",
    customerCollectible: false,
    institutionOnly: true,
  },
  {
    id: "agencySubmission",
    category: "institution",
    label: "공단제출신청서",
    leadDocKey: "employmentAccidentHistory",
    customerCollectible: false,
    institutionOnly: true,
  },
];

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  medical: "의료기관 서류",
  personal: "개인/현장 증빙 서류",
  institution: "기관 발급 서류",
};

export const DOC_CATEGORY_ORDER: DocCategory[] = [
  "medical",
  "personal",
  "institution",
];

/** 고객 접수 후 3단계 위저드 정의 */
export const INTAKE_WIZARD_STEPS = [
  {
    step: 1,
    title: "신분증 사본",
    description: "주민등록증 또는 운전면허증 사본을 첨부해 주세요.",
    category: "personal" as DocCategory,
    slotIds: ["idCard"] as DocSlotId[],
    multi: false,
  },
  {
    step: 2,
    title: "의료기관 서류",
    description:
      "진단서, 초진기록지, 수술기록지, 영상판독지, 입·퇴원확인서 등을 한 번에 선택해 올릴 수 있습니다.",
    category: "medical" as DocCategory,
    slotIds: [
      "diagnosisReport",
      "initialChart",
      "surgeryRecord",
      "imagingReport",
      "admissionDischarge",
    ] as DocSlotId[],
    multi: true,
  },
  {
    step: 3,
    title: "개인/소득 증빙",
    description:
      "급여명세서, 통장내역, 근로계약서, 재해경위서, 현장사진 등을 한 번에 선택해 올릴 수 있습니다.",
    category: "personal" as DocCategory,
    slotIds: [
      "employmentContract",
      "payroll",
      "accidentStatement",
      "sitePhoto",
    ] as DocSlotId[],
    multi: true,
  },
] as const;

export function getSlotDefinition(slotId: DocSlotId): DocSlotDefinition | undefined {
  return DOC_COLLECTION_SLOTS.find((s) => s.id === slotId);
}

export function slotsForCategory(category: DocCategory): DocSlotDefinition[] {
  return DOC_COLLECTION_SLOTS.filter((s) => s.category === category);
}

export function slotsForDocCategory(
  category: DocCategory,
  diseaseCategory?: DiseaseCategory | null,
): DocSlotDefinition[] {
  const slots = slotsForCategory(category);
  if (category !== "medical") return slots;
  const allowed = new Set(getMedicalSlotIdsForDisease(diseaseCategory));
  return slots.filter((s) => allowed.has(s.id));
}

export function isSlotCollected(
  slot: DocSlotDefinition,
  docsStatus: LeadDocsStatus,
  docFiles: LeadDocFilesMap,
  otherDocs: OtherDocEntry[],
): boolean {
  if (slot.leadDocKey) {
    if (docHasStoredFile(slot.leadDocKey, docsStatus, docFiles)) return true;
    if (docsStatus[slot.leadDocKey]) return true;
  }
  return otherDocs.some((doc) => doc.slotId === slot.id);
}

/** 위임장·약정서 (전자서명 PDF / has_weim) */
export function isMandateContractCollected(
  docsStatus: LeadDocsStatus,
  docFiles: LeadDocFilesMap,
): boolean {
  if (docsStatus.mandateContract) return true;
  return docHasStoredFile("mandateContract", docsStatus, docFiles);
}

export function calculateCollectionProgress(
  docsStatus: LeadDocsStatus,
  docFiles: LeadDocFilesMap,
  otherDocs: OtherDocEntry[],
  diseaseCategory?: DiseaseCategory | null,
): {
  percent: number;
  collected: number;
  total: number;
  mandateCollected: boolean;
  byCategory: Record<DocCategory, { collected: number; total: number; percent: number }>;
} {
  const byCategory = {} as Record<
    DocCategory,
    { collected: number; total: number; percent: number }
  >;

  let collected = 0;
  let total = 0;

  const mandateCollected = isMandateContractCollected(docsStatus, docFiles);
  if (mandateCollected) collected += 1;
  total += 1;

  for (const category of DOC_CATEGORY_ORDER) {
    const slots = slotsForDocCategory(category, diseaseCategory);
    const catCollected = slots.filter((slot) =>
      isSlotCollected(slot, docsStatus, docFiles, otherDocs),
    ).length;
    const catTotal = slots.length;
    byCategory[category] = {
      collected: catCollected,
      total: catTotal,
      percent: catTotal > 0 ? Math.round((catCollected / catTotal) * 100) : 0,
    };
    collected += catCollected;
    total += catTotal;
  }

  return {
    collected,
    total,
    percent: total > 0 ? Math.round((collected / total) * 100) : 0,
    mandateCollected,
    byCategory,
  };
}

/** 위저드 다중 업로드 — 남은 슬롯 순서대로 매핑 */
export function resolveWizardUploadTargets(
  wizardStep: 1 | 2 | 3,
  fileCount: number,
): { slotId: DocSlotId; leadDocKey?: LeadDocKey; category: DocCategory }[] {
  const def = INTAKE_WIZARD_STEPS.find((s) => s.step === wizardStep);
  if (!def) return [];

  const targets: { slotId: DocSlotId; leadDocKey?: LeadDocKey; category: DocCategory }[] =
    [];
  for (let i = 0; i < fileCount; i += 1) {
    const slotId = def.slotIds[i] ?? def.slotIds[def.slotIds.length - 1];
    const slot = getSlotDefinition(slotId);
    targets.push({
      slotId,
      leadDocKey: slot?.leadDocKey,
      category: def.category,
    });
  }
  return targets;
}
