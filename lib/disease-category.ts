import type { DocSlotId } from "@/lib/document-collection-catalog";

export const DISEASE_CATEGORIES = [
  "근골격계",
  "뇌심혈관",
  "진폐/COPD",
  "정신질환",
  "기타",
] as const;

export type DiseaseCategory = (typeof DISEASE_CATEGORIES)[number];

export type DiseaseCategoryFilterId = "all" | DiseaseCategory;

export const DISEASE_CATEGORY_FILTERS: { id: DiseaseCategoryFilterId; label: string }[] = [
  { id: "all", label: "질병 전체" },
  ...DISEASE_CATEGORIES.map((c) => ({ id: c as DiseaseCategoryFilterId, label: c })),
];

export const DISEASE_CATEGORY_BADGE_CLASS: Record<DiseaseCategory, string> = {
  근골격계: "bg-blue-100 text-blue-800 border-blue-200",
  뇌심혈관: "bg-red-100 text-red-800 border-red-200",
  "진폐/COPD": "bg-slate-100 text-slate-700 border-slate-300",
  정신질환: "bg-purple-100 text-purple-800 border-purple-200",
  기타: "bg-amber-50 text-amber-800 border-amber-200",
};

/** 카테고리별 의료기관 서류 노출 슬롯 */
export const MEDICAL_SLOTS_BY_DISEASE: Record<DiseaseCategory, DocSlotId[]> = {
  근골격계: [
    "diagnosisReport",
    "initialChart",
    "imagingReport",
    "surgeryRecord",
    "admissionDischarge",
  ],
  뇌심혈관: ["diagnosisReport", "initialChart", "imagingReport", "admissionDischarge"],
  "진폐/COPD": ["diagnosisReport", "initialChart", "imagingReport", "admissionDischarge"],
  정신질환: ["diagnosisReport", "initialChart", "admissionDischarge"],
  기타: [
    "diagnosisReport",
    "initialChart",
    "surgeryRecord",
    "imagingReport",
    "admissionDischarge",
  ],
};

const FORM_CATEGORY_TO_DISEASE: Record<string, DiseaseCategory> = {
  joint: "근골격계",
  heart: "뇌심혈관",
  lung: "진폐/COPD",
  ear: "기타",
};

const SYMPTOM_TO_DISEASE: Record<string, DiseaseCategory> = {
  bone: "근골격계",
  hearing: "기타",
  respiratory: "진폐/COPD",
  overwork: "뇌심혈관",
  stress: "정신질환",
  accident: "근골격계",
};

const DISEASE_NAME_PREFIX_TO_CATEGORY: Record<string, DiseaseCategory> = {
  "관절/허리 질환 (디스크 등)": "근골격계",
  "뇌·심장 질환 (과로·뇌출혈 등)": "뇌심혈관",
  "폐·호흡기 질환 (진폐·숨참 등)": "진폐/COPD",
  "귀 질환 (이명·난청)": "기타",
};

export function isDiseaseCategory(value: string | null | undefined): value is DiseaseCategory {
  return DISEASE_CATEGORIES.includes(value as DiseaseCategory);
}

export function matchesDiseaseCategoryFilter(
  category: DiseaseCategory | null,
  filterId: DiseaseCategoryFilterId,
): boolean {
  if (filterId === "all") return true;
  return category === filterId;
}

export function getMedicalSlotIdsForDisease(
  category: DiseaseCategory | null | undefined,
): DocSlotId[] {
  if (!category || !isDiseaseCategory(category)) {
    return MEDICAL_SLOTS_BY_DISEASE.기타;
  }
  return MEDICAL_SLOTS_BY_DISEASE[category];
}

export function mapFormCategoryToDiseaseCategory(
  formCategory: string | null | undefined,
): DiseaseCategory | null {
  if (!formCategory) return null;
  return FORM_CATEGORY_TO_DISEASE[formCategory] ?? null;
}

export function mapSymptomToDiseaseCategory(
  symptom: string | null | undefined,
): DiseaseCategory | null {
  if (!symptom) return null;
  return SYMPTOM_TO_DISEASE[symptom] ?? null;
}

function parseSymptomLabelFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  for (const line of notes.split("\n")) {
    const m = line.match(/^\[질환 유형\]\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

function inferFromDiseaseName(diseaseName: string | null | undefined): DiseaseCategory | null {
  if (!diseaseName) return null;
  for (const [prefix, category] of Object.entries(DISEASE_NAME_PREFIX_TO_CATEGORY)) {
    if (diseaseName.startsWith(prefix)) return category;
  }
  if (diseaseName.includes("디스크") || diseaseName.includes("관절") || diseaseName.includes("허리")) {
    return "근골격계";
  }
  if (diseaseName.includes("진폐") || diseaseName.includes("COPD") || diseaseName.includes("호흡")) {
    return "진폐/COPD";
  }
  if (diseaseName.includes("뇌") || diseaseName.includes("심장") || diseaseName.includes("과로")) {
    return "뇌심혈관";
  }
  if (diseaseName.includes("우울") || diseaseName.includes("불안") || diseaseName.includes("정신")) {
    return "정신질환";
  }
  return null;
}

/** DB 값 → 표시용 카테고리 (없으면 notes·disease_name에서 추론) */
export function resolveDiseaseCategory(
  stored: string | null | undefined,
  diseaseName?: string | null,
  notes?: string | null,
): DiseaseCategory | null {
  if (stored && isDiseaseCategory(stored)) return stored;

  const symptomLabel = parseSymptomLabelFromNotes(notes);
  if (symptomLabel) {
    if (symptomLabel.includes("관절") || symptomLabel.includes("허리") || symptomLabel.includes("근골격")) {
      return "근골격계";
    }
    if (symptomLabel.includes("뇌") || symptomLabel.includes("심장") || symptomLabel.includes("과로")) {
      return "뇌심혈관";
    }
    if (symptomLabel.includes("폐") || symptomLabel.includes("호흡") || symptomLabel.includes("진폐")) {
      return "진폐/COPD";
    }
    if (symptomLabel.includes("스트레스") || symptomLabel.includes("정신")) {
      return "정신질환";
    }
  }

  return inferFromDiseaseName(diseaseName);
}

export function resolveDiseaseCategoryForInsert(
  formCategory: string | null | undefined,
  notes: string | null | undefined,
): DiseaseCategory {
  return (
    mapFormCategoryToDiseaseCategory(formCategory) ??
    resolveDiseaseCategory(null, null, notes) ??
    "기타"
  );
}
