import type { DiseaseCategory } from "@/lib/disease-category";

export type V2DiseaseFilterId =
  | "all"
  | "musculoskeletal"
  | "hearing"
  | "lung"
  | "cardiovascular"
  | "cancer"
  | "mental"
  | "accident";

export const V2_DISEASE_FILTERS: { id: V2DiseaseFilterId; label: string }[] = [
  { id: "all", label: "질병 전체" },
  { id: "musculoskeletal", label: "근골격계" },
  { id: "hearing", label: "소음성 난청" },
  { id: "lung", label: "진폐/COPD" },
  { id: "cardiovascular", label: "뇌심혈관 (과로사)" },
  { id: "cancer", label: "직업성 암" },
  { id: "mental", label: "정신질환" },
  { id: "accident", label: "사고성 산재" },
];

type ClassifyInput = {
  diseaseCategory: DiseaseCategory | null;
  diseaseName?: string | null;
  notes?: string | null;
};

function haystack(input: ClassifyInput): string {
  return `${input.diseaseName ?? ""}\n${input.notes ?? ""}`.toLowerCase();
}

/** UI 필터 칩 → 세분화 버킷 (DB disease_category + 텍스트 추론) */
export function classifyV2DiseaseFilterBucket(input: ClassifyInput): V2DiseaseFilterId {
  const text = haystack(input);

  if (/난청|소음|이명|청력|귀\s*질환/.test(text)) return "hearing";
  if (/직업성\s*암|암\b|폐암|백혈병|석면암/.test(text)) return "cancer";
  if (/사고|추락|끼임|부딪|산재사고|재해/.test(text)) return "accident";
  if (/우울|불안|정신|스트레스|ptsd|burnout|번아웃/.test(text)) return "mental";
  if (/진폐|copd|폐|호흡|석면|먼지/.test(text)) return "lung";
  if (/뇌|심장|심근|뇌출혈|뇌경색|과로|혈관/.test(text)) return "cardiovascular";
  if (/디스크|관절|허리|목|어깨|근골격|터널|건염|요통/.test(text)) return "musculoskeletal";

  if (input.diseaseCategory === "근골격계") return "musculoskeletal";
  if (input.diseaseCategory === "진폐/COPD") return "lung";
  if (input.diseaseCategory === "뇌심혈관") return "cardiovascular";
  if (input.diseaseCategory === "정신질환") return "mental";
  if (input.diseaseCategory === "기타") {
    if (/귀|난청|이명/.test(text)) return "hearing";
    return "musculoskeletal";
  }

  return "musculoskeletal";
}

export function matchesV2DiseaseFilter(
  input: ClassifyInput,
  filterId: V2DiseaseFilterId,
): boolean {
  if (filterId === "all") return true;
  return classifyV2DiseaseFilterBucket(input) === filterId;
}
