/** DynamicForm notes → 노무사용 설문 보고서 파싱 */

export type SurveyCategory =
  | "bone"
  | "hearing"
  | "respiratory"
  | "overwork"
  | "stress"
  | "accident"
  | "legacy"
  | "general";

export type SurveyReportItem = { label: string; value: string };

export type SurveyReportSection = {
  title: string;
  emoji: string;
  items: SurveyReportItem[];
};

const SKIP_KEYS = new Set([
  "유입 링크",
  "접수 폼",
  "고객 추가 의견",
]);

const CATEGORY_META: Record<
  SurveyCategory,
  { title: string; emoji: string }
> = {
  bone: { title: "근골격계 질환", emoji: "🦴" },
  hearing: { title: "소음성 난청", emoji: "👂" },
  respiratory: { title: "호흡기 질병", emoji: "🫁" },
  overwork: { title: "뇌·심혈관 (과로)", emoji: "💔" },
  stress: { title: "우울증·스트레스", emoji: "🧠" },
  accident: { title: "기타 사고·질환", emoji: "⚠️" },
  legacy: { title: "기존 설문 (구버전)", emoji: "📋" },
  general: { title: "설문 응답", emoji: "📋" },
};

/** notes 전체에서 `[키] 값` 패턴 추출 (중첩·다중行) */
export function parseSurveyFieldMap(notes: string | null): Record<string, string> {
  if (!notes?.trim()) return {};

  const map: Record<string, string> = {};

  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const m = trimmed.match(/^\[(.+?)\]\s*(.+)$/);
    if (!m) continue;

    const key = m[1].trim();
    const value = m[2].trim();
    if (!value) continue;

    if (key.startsWith("노무사 메모 ") || key.startsWith("상태 변경 ")) {
      continue;
    }

    if (key === "고객 추가 의견") {
      const nested = value.match(/^\[(.+?)\]\s*(.+)$/);
      if (nested) {
        map[nested[1].trim()] = nested[2].trim();
        continue;
      }
      map[key] = value;
      continue;
    }

    map[key] = value;
  }

  return map;
}

export function detectSurveyCategory(
  fields: Record<string, string>,
  diseaseName?: string | null,
): SurveyCategory {
  const symptom = fields["질환 유형"] ?? "";

  if (symptom.includes("난청") || symptom.includes("귀") || fields["귀 상태"]) {
    return "hearing";
  }
  if (
    symptom.includes("근골격") ||
    fields["통증 부위"] ||
    fields["자세/동작"] ||
    fields["중량물"]
  ) {
    return "bone";
  }
  if (symptom.includes("호흡") || fields["호흡기 노출"] || fields["흡연"]) {
    return "respiratory";
  }
  if (
    symptom.includes("뇌") ||
    symptom.includes("심혈") ||
    symptom.includes("과로") ||
    fields["상담 대상"] ||
    fields["발병 계기"]
  ) {
    return "overwork";
  }
  if (
    symptom.includes("우울") ||
    symptom.includes("스트레스") ||
    fields["스트레스 원인"]
  ) {
    return "stress";
  }
  if (symptom.includes("사고") || fields["사고/증상 지속"]) {
    return "accident";
  }

  const disease = diseaseName ?? "";
  if (disease.includes("귀") || disease.includes("난청")) return "hearing";
  if (disease.includes("관절") || disease.includes("허리") || disease.includes("디스크")) {
    return "bone";
  }
  if (disease.includes("폐") || disease.includes("호흡")) return "respiratory";
  if (disease.includes("뇌") || disease.includes("심장") || disease.includes("과로")) {
    return "overwork";
  }

  if (fields["나이"] || fields["현재 상태"] || fields["산재 신청 의향"]) {
    return "legacy";
  }

  return Object.keys(fields).length > 0 ? "general" : "general";
}

function pick(fields: Record<string, string>, specs: { key: string; label: string }[]): SurveyReportItem[] {
  return specs
    .map(({ key, label }) => {
      const value = fields[key]?.trim();
      return value ? { label, value } : null;
    })
    .filter((item): item is SurveyReportItem => item !== null);
}

function extractDiagnosisFromDiseaseName(diseaseName?: string | null): string | null {
  if (!diseaseName?.trim()) return null;
  const m = diseaseName.match(/\(진단명:\s*(.+?)\)/);
  return m?.[1]?.trim() ?? null;
}

const BASE_SPECS: { key: string; label: string }[] = [
  { key: "질환 유형", label: "질환 카테고리" },
  { key: "재직 상태", label: "재직 상태" },
  { key: "4대보험", label: "4대보험" },
  { key: "직종", label: "직종·업무" },
  { key: "근무 기간", label: "근무 기간" },
  { key: "나이", label: "나이" },
  { key: "직업", label: "직업" },
];

const BONE_SPECS: { key: string; label: string }[] = [
  { key: "진단명", label: "정확한 진단명" },
  { key: "통증 부위", label: "선택 부위" },
  { key: "자세/동작", label: "작업 자세" },
  { key: "중량물", label: "중량물 취급" },
  { key: "증상 시작", label: "증상 발현 시점" },
];

const HEARING_SPECS: { key: string; label: string }[] = [
  { key: "귀 상태", label: "현재 귀 상태" },
  { key: "과거 난청/이명", label: "과거 병력" },
  { key: "귀마개 지급", label: "보호구 착용" },
];

const RESPIRATORY_SPECS: { key: string; label: string }[] = [
  { key: "호흡기 노출", label: "유해 노출 환경" },
  { key: "흡연", label: "흡연 여부" },
];

const OVERWORK_SPECS: { key: string; label: string }[] = [
  { key: "상담 대상", label: "상담 대상 (환자/유족)" },
  { key: "발병 계기", label: "발병·돌발 변수" },
];

const STRESS_SPECS: { key: string; label: string }[] = [
  { key: "스트레스 원인", label: "스트레스 원인" },
  { key: "증거 자료", label: "증거 자료 유무" },
];

const ACCIDENT_SPECS: { key: string; label: string }[] = [
  { key: "사고/증상 지속", label: "사고·증상 지속 여부" },
];

const LEGACY_SPECS: { key: string; label: string }[] = [
  { key: "근무기간", label: "근무 기간" },
  { key: "현재 상태", label: "현재 상태" },
  { key: "진단 여부", label: "진단 여부" },
  { key: "병원", label: "병원" },
  { key: "회사 인지", label: "회사 인지" },
  { key: "산재 논의", label: "산재 논의" },
  { key: "회사 반응", label: "회사 반응" },
  { key: "업무 연관성", label: "업무 연관성" },
  { key: "산재 신청 의향", label: "산재 신청 의향" },
];

const CONTACT_SPECS: { key: string; label: string }[] = [
  { key: "주소", label: "주소" },
  { key: "주민등록번호", label: "주민등록번호" },
  { key: "내부 등급", label: "내부 등급 (자동)" },
];

function categorySpecs(category: SurveyCategory): { key: string; label: string }[] {
  switch (category) {
    case "bone":
      return BONE_SPECS;
    case "hearing":
      return HEARING_SPECS;
    case "respiratory":
      return RESPIRATORY_SPECS;
    case "overwork":
      return OVERWORK_SPECS;
    case "stress":
      return STRESS_SPECS;
    case "accident":
      return ACCIDENT_SPECS;
    case "legacy":
      return LEGACY_SPECS;
    default:
      return [];
  }
}

/** 질환별 + 공통 + 연락처 섹션 구성 */
export function buildSurveyReportSections(
  notes: string | null,
  diseaseName?: string | null,
): SurveyReportSection[] {
  const fields = parseSurveyFieldMap(notes);
  const category = detectSurveyCategory(fields, diseaseName);
  const meta = CATEGORY_META[category];

  const sections: SurveyReportSection[] = [];

  const baseItems = pick(fields, BASE_SPECS);
  if (baseItems.length > 0) {
    sections.push({ title: "기본·재직 정보", emoji: "👤", items: baseItems });
  }

  const categoryItems = pick(fields, categorySpecs(category));
  const diagnosis = extractDiagnosisFromDiseaseName(diseaseName);
  const hasDiagnosisField = categoryItems.some((i) => i.label.includes("진단"));
  if (diagnosis && !hasDiagnosisField && (category === "bone" || category === "general" || category === "legacy")) {
    categoryItems.unshift({ label: "정확한 진단명", value: diagnosis });
  } else if (diagnosis && !hasDiagnosisField) {
    categoryItems.push({ label: "정확한 진단명", value: diagnosis });
  }

  if (categoryItems.length > 0) {
    sections.push({
      title: `${meta.title} 상세`,
      emoji: meta.emoji,
      items: categoryItems,
    });
  }

  const contactItems = pick(fields, CONTACT_SPECS);
  if (contactItems.length > 0) {
    sections.push({ title: "제출·연락 정보", emoji: "📍", items: contactItems });
  }

  const usedKeys = new Set<string>([
    ...BASE_SPECS,
    ...categorySpecs(category),
    ...CONTACT_SPECS,
    ...LEGACY_SPECS,
    ...BONE_SPECS,
    ...HEARING_SPECS,
    ...RESPIRATORY_SPECS,
    ...OVERWORK_SPECS,
    ...STRESS_SPECS,
    ...ACCIDENT_SPECS,
  ].map((s) => s.key));

  const extraItems: SurveyReportItem[] = Object.entries(fields)
    .filter(([key, value]) => value?.trim() && !SKIP_KEYS.has(key) && !usedKeys.has(key))
    .map(([key, value]) => ({ label: key, value: value.trim() }));

  if (extraItems.length > 0) {
    sections.push({ title: "기타 응답", emoji: "📎", items: extraItems });
  }

  const memo = fields["고객 추가 의견"]?.trim();
  if (memo && !memo.startsWith("[")) {
    sections.push({
      title: "고객 추가 의견",
      emoji: "📝",
      items: [{ label: "메모", value: memo }],
    });
  }

  return sections;
}

export function hasSurveyReportContent(notes: string | null, diseaseName?: string | null): boolean {
  return buildSurveyReportSections(notes, diseaseName).some((s) => s.items.length > 0);
}
