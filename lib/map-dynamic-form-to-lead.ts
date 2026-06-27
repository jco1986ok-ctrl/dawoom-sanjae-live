import type { FormData, LeadGrade } from "@/components/DynamicForm";
import { joinFormLabels, resolveDiagnosisForSubmit } from "@/lib/form-array-fields";

/** 기존 /api/leads/submit 스키마 — Supabase leads INSERT 호환 */
export interface LeadSubmitPayload {
  name: string;
  phone: string;
  age?: string;
  job?: string;
  category?: string;
  diagnosisName?: string;
  workYears?: string;
  hasDiagnosis?: boolean | null;
  hospitalName?: string;
  currentStatus?: string;
  companyAwareness?: string;
  sanjaeDiscussion?: string;
  companyReaction?: string;
  workRelation?: string;
  sanjaeIntent?: string;
  additionalComment?: string;
  refCode?: string | null;
  partnerName?: string | null;
  referrer?: string;
}

const SYMPTOM_TO_CATEGORY: Record<string, string> = {
  hearing: "ear",
  bone: "joint",
  respiratory: "lung",
  overwork: "heart",
  stress: "joint",
  accident: "joint",
};

function line(label: string, value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? `[${label}] ${v}` : null;
}

function lineFromField(
  label: string,
  value: string | string[] | null | undefined,
): string | null {
  if (Array.isArray(value)) {
    const joined = joinFormLabels(value);
    return joined ? `[${label}] ${joined}` : null;
  }
  return line(label, value);
}

function resolveDiagnosisLabel(data: FormData): string {
  const merged = resolveDiagnosisForSubmit(data.diagnosis, data.diagnosisOtherText);
  return joinFormLabels(merged);
}

function buildAdditionalComment(
  data: FormData,
  internalGrade: LeadGrade | null,
): string {
  const lines = [
    line("질환 유형", data.symptomLabel),
    line("재직 상태", data.employmentLabel),
    line("4대보험", data.insuranceLabel),
    line("귀 상태", data.hearingEarStatus),
    line("과거 난청/이명", data.hearingPastHistory),
    line("귀마개 지급", data.hearingProtection),
    lineFromField("진단명", resolveDiagnosisForSubmit(data.diagnosis, data.diagnosisOtherText)),
    lineFromField("통증 부위", data.painBodyPart),
    line("자세/동작", data.posture),
    line("중량물", data.weight),
    line("증상 시작", data.symptomTime),
    line("호흡기 노출", data.respiratoryExposure),
    line("흡연", data.respiratorySmoking),
    line("상담 대상", data.overworkPatientStatus),
    line("발병 계기", data.overworkSuddenTrigger),
    line("직종", data.occupationOther || data.occupationLabel),
    line("근무 기간", data.workDurationLabel),
    line("스트레스 원인", data.stressCauseLabel),
    line("증거 자료", data.evidenceLabel),
    line("사고/증상 지속", data.genericDetailLabel),
    line("주소", data.address),
    data.consentPersonalInfo ? line("개인정보 동의", "동의함") : null,
    data.consentUniqueId ? line("고유식별정보 동의", "동의함") : null,
    data.consentConsultation ? line("상담 신청 동의", "동의함") : null,
    data.residentNumberFront && data.residentNumberBack
      ? `[주민등록번호] ${data.residentNumberFront}-${data.residentNumberBack.slice(0, 1)}${"•".repeat(6)}`
      : null,
    internalGrade ? `[내부 등급] ${internalGrade}` : null,
    "[접수 폼] 신규 DynamicForm v2",
  ].filter((l): l is string => Boolean(l));

  return lines.join("\n");
}

export function mapDynamicFormToLeadSubmit(
  data: FormData,
  options: {
    internalGrade?: LeadGrade | null;
    refCode?: string | null;
    partnerName?: string | null;
    referrer?: string;
  } = {},
): LeadSubmitPayload {
  const category = data.symptom ? SYMPTOM_TO_CATEGORY[data.symptom] : undefined;
  const job =
    data.occupation === "other" && data.occupationOther?.trim()
      ? data.occupationOther.trim()
      : data.occupationLabel || undefined;

  let currentStatus: string | undefined;
  if (data.employment === "employed") currentStatus = "working";
  else if (data.employment === "resigned") currentStatus = "already-left";

  const diagnosis = resolveDiagnosisLabel(data);

  return {
    name: data.name.trim(),
    phone: data.phone.trim(),
    job,
    category,
    diagnosisName: diagnosis || undefined,
    workYears: data.workDurationLabel || undefined,
    hasDiagnosis: diagnosis ? true : null,
    currentStatus,
    additionalComment: buildAdditionalComment(data, options.internalGrade ?? null),
    refCode: options.refCode ?? null,
    partnerName: options.partnerName ?? null,
    referrer: options.referrer,
  };
}
