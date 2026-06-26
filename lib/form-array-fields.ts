/** DynamicForm 다중 선택 필드 — 문자열 ↔ 배열 변환 */

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function toggleArrayItem(values: string[], item: string): string[] {
  return values.includes(item)
    ? values.filter((v) => v !== item)
    : [...values, item];
}

export function joinFormLabels(values: string[] | string | null | undefined): string {
  if (Array.isArray(values)) {
    return values
      .filter((v) => typeof v === "string" && v.trim())
      .map((v) => v.trim())
      .join(", ");
  }
  if (typeof values === "string") return values.trim();
  return "";
}

/** 정해진 보기 + 기타 직접 입력을 중복 없이 하나의 배열로 합침 */
export function mergeDiagnosisSelections(
  diagnosis: string[],
  optionList: readonly string[],
  otherText?: string,
): string[] {
  const optionSet = new Set(optionList);
  const fromOptions = diagnosis.filter((d) => optionSet.has(d));
  const customExisting = diagnosis.filter((d) => !optionSet.has(d));
  const otherNew = otherText?.trim() ?? "";
  const merged = [...fromOptions, ...customExisting];
  if (otherNew && !merged.includes(otherNew)) merged.push(otherNew);
  return [...new Set(merged)];
}

/** 폼 제출용 진단명 배열 (기타 텍스트·미병합 상태 대비) */
export function resolveDiagnosisForSubmit(
  diagnosis: string[],
  otherText?: string,
  optionList?: readonly string[],
): string[] {
  if (optionList && optionList.length > 0) {
    return mergeDiagnosisSelections(diagnosis, optionList, otherText);
  }
  const merged = [...diagnosis];
  const other = otherText?.trim();
  if (other && !merged.includes(other)) merged.push(other);
  return [...new Set(merged)];
}

/** notes·disease_name → 대시보드 질병명 한 줄 표시 */
export function formatLeadDiseaseDisplay(
  notes: string | null | undefined,
  diseaseName?: string | null,
): string {
  if (!notes?.trim() && !diseaseName?.trim()) return "—";

  const parts = extractNoteField(notes, "통증 부위");
  const diagnosis = extractNoteField(notes, "진단명");

  if (parts && diagnosis) return `${parts} / ${diagnosis}`;
  if (parts) return parts;
  if (diagnosis) return diagnosis;
  return diseaseName?.trim() || "—";
}

function extractNoteField(notes: string | null | undefined, key: string): string | null {
  if (!notes?.trim()) return null;
  const re = new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\s*(.+)$`, "m");
  const m = notes.match(re);
  return m?.[1]?.trim() || null;
}
