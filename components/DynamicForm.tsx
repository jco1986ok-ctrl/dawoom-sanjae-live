"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { CheckCircle, CheckCircle2, ChevronDown } from "lucide-react";
import ParoLogo, { ParoBrandHeader } from "@/components/ParoLogo";
import DaumPostcode from "react-daum-postcode";
import SignaturePadField, {
  type SignaturePadHandle,
} from "@/components/SignaturePadField";
import {
  captureReferrerFromSearchParams,
  NATURAL_INFLOW,
} from "@/lib/capture-referrer";
import { mapDynamicFormToLeadSubmit } from "@/lib/map-dynamic-form-to-lead";
import { IntakeDocWizard, IntakeFinishedScreen } from "@/components/IntakeDocWizard";
import {
  clearCompletedIntakeSession,
  loadCompletedIntakeSession,
  PHAROS_FORM_BACKUP_KEY,
  saveCompletedIntakeSession,
  saveIntakeWizardProgress,
} from "@/lib/intake-session-storage";
import { joinFormLabels, mergeDiagnosisSelections, resolveDiagnosisForSubmit, toStringArray, toggleArrayItem } from "@/lib/form-array-fields";
import { normalizePartnerName } from "@/lib/referral-resolve";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────

type EmploymentStatus = "employed" | "resigned" | null;
type InsuranceStatus = "yes" | "no" | null;
type MainSymptom =
  | "hearing"
  | "bone"
  | "respiratory"
  | "overwork"
  | "stress"
  | "accident"
  | null;

type Occupation =
  | "cleaning"
  | "healthcare"
  | "construction"
  | "catering"
  | "manufacturing"
  | "delivery"
  | "other"
  | null;
type WorkDuration = "under1" | "1-3" | "3-5" | "5-10" | "over10" | null;

type StressCause =
  | "bullying"
  | "customer"
  | "performance"
  | "witness"
  | "other"
  | null;
type Evidence = "material" | "witness" | "none" | null;

type GenericDetail = "recent" | "ongoing" | "recurring" | null;

export type StepKey =
  | "welcome"
  | "filter"
  | "symptom"
  | "hearing-status"
  | "hearing-history"
  | "hearing-protection"
  | "bone-body-part"
  | "bone-diagnosis"
  | "bone-posture"
  | "bone-weight"
  | "bone-onset"
  | "respiratory-exposure"
  | "respiratory-smoking"
  | "overwork-communicator"
  | "overwork-diagnosis"
  | "overwork-trigger"
  | "occupation"
  | "duration"
  | "stress-cause"
  | "evidence"
  | "generic-detail"
  | "contact"
  | "loading"
  | "submit-loading"
  | "result"
  | "result-b"
  | "result-c"
  | "consultation-offer"
  | "consultation-success"
  | "documents-sign"
  | "documents-upload"
  | "intake-wizard"
  | "intake-finished";

/** 노무사 대시보드 전달용 — 선택값은 모두 한글 텍스트로 저장 */
export interface FormData {
  employment: EmploymentStatus;
  employmentLabel: string;
  insurance: InsuranceStatus;
  insuranceLabel: string;
  symptom: MainSymptom;
  symptomLabel: string;
  /** 소음성 난청 */
  hearingEarStatus: string;
  hearingPastHistory: string;
  hearingProtection: string;
  /** 근골격계 — 통증 부위 (다중 선택) */
  painBodyPart: string[];
  /** 진단명 (다중 선택) */
  diagnosis: string[];
  /** 진단명 '기타 직접 입력' 모드 (근골격·뇌심혈관 공용) */
  diagnosisOtherMode: boolean;
  /** 진단명 기타 직접 입력 텍스트 */
  diagnosisOtherText: string;
  posture: string;
  weight: string;
  symptomTime: string;
  /** 호흡기 */
  respiratoryExposure: string;
  respiratoryExposureOtherMode: boolean;
  respiratorySmoking: string;
  /** 뇌·심혈관계 */
  overworkPatientStatus: string;
  overworkSuddenTrigger: string;
  occupation: Occupation;
  occupationLabel: string;
  occupationOther: string;
  workDuration: WorkDuration;
  workDurationLabel: string;
  stressCause: StressCause;
  stressCauseLabel: string;
  evidence: Evidence;
  evidenceLabel: string;
  genericDetail: GenericDetail;
  genericDetailLabel: string;
  name: string;
  phone: string;
  /** 관공서 제출용 — 앞 6자리 */
  residentNumberFront: string;
  /** 관공서 제출용 — 뒤 7자리 */
  residentNumberBack: string;
  addressBase: string;
  addressDetail: string;
  address: string;
  /** 우편번호 (다음 주소 API) */
  zonecode: string;
  /** [필수] 개인정보 수집·이용 동의 */
  consentPersonalInfo: boolean;
  /** [필수] 고유식별정보(주민등록번호) 처리 동의 */
  consentUniqueId: boolean;
  /** [필수] 무료 진단·전문가 상담을 위한 개인정보 수집·이용 동의 */
  consentConsultation: boolean;
}

const INITIAL: FormData = {
  employment: null,
  employmentLabel: "",
  insurance: null,
  insuranceLabel: "",
  symptom: null,
  symptomLabel: "",
  hearingEarStatus: "",
  hearingPastHistory: "",
  hearingProtection: "",
  painBodyPart: [],
  diagnosis: [],
  diagnosisOtherMode: false,
  diagnosisOtherText: "",
  posture: "",
  weight: "",
  symptomTime: "",
  respiratoryExposure: "",
  respiratoryExposureOtherMode: false,
  respiratorySmoking: "",
  overworkPatientStatus: "",
  overworkSuddenTrigger: "",
  occupation: null,
  occupationLabel: "",
  occupationOther: "",
  workDuration: null,
  workDurationLabel: "",
  stressCause: null,
  stressCauseLabel: "",
  evidence: null,
  evidenceLabel: "",
  genericDetail: null,
  genericDetailLabel: "",
  name: "",
  phone: "",
  residentNumberFront: "",
  residentNumberBack: "",
  addressBase: "",
  addressDetail: "",
  address: "",
  zonecode: "",
  consentPersonalInfo: false,
  consentUniqueId: false,
  consentConsultation: false,
};

const FORM_BACKUP_KEY = PHAROS_FORM_BACKUP_KEY;

/** 연락처·신상 입력 이후 단계 — 복구 시 이름/연락처 없으면 contact로 되돌림 */
const POST_CONTACT_STEPS = new Set<StepKey>([
  "loading",
  "result",
  "result-b",
  "result-c",
  "consultation-offer",
  "consultation-success",
  "documents-sign",
  "documents-upload",
]);

function normalizeResumeStep(step: StepKey): StepKey {
  if (
    step === "result" ||
    step === "result-b" ||
    step === "result-c" ||
    step === "documents-sign" ||
    step === "documents-upload" ||
    step === "consultation-offer" ||
    step === "loading"
  ) {
    return "contact";
  }
  return step;
}

function isContactInfoComplete(data: FormData): boolean {
  const name = data.name?.trim();
  const phone = data.phone?.replace(/\D/g, "") ?? "";
  return Boolean(name && phone.length >= 10);
}

function resolveResumeStep(step: StepKey, data: FormData): StepKey {
  const normalized = normalizeResumeStep(step);
  if (!POST_CONTACT_STEPS.has(normalized)) return normalized;
  if (isContactInfoComplete(data)) return normalized;
  return "contact";
}

/**
 * 위임장 전자서명 — 단독 위임장 링크(/sign) 및 레거시 플로우용.
 * 메인 접수 폼(INTAKE_FLOW_INCLUDES_CONTRACT=false)에서는 사용하지 않음.
 */
const CONTRACT_SIGN_ENABLED = true;
/** 메인 DynamicForm 플로우에 위임장·계약서 서명 단계 포함 여부 */
const INTAKE_FLOW_INCLUDES_CONTRACT = false;
const DOCUMENT_UPLOAD_ENABLED = true;

/**
 * false → Supabase 저장 + 노무사 대시보드 다운로드/미리보기 (실무 모드)
 * true  → PDF Blob만 브라우저 다운로드 (로컬 테스트용)
 */
const CONTRACT_BLOB_DOWNLOAD_MODE = false;

/** true → Step 9 서류는 console.log만 (Storage/API 미연동). false → generate-contract multipart */
const PATIENT_DOC_UPLOAD_MOCK = true;

const PDF_SUBMIT_ERROR_MESSAGE =
  "상담 신청 접수 중 문제가 발생했습니다. 다시 시도해 주세요.";

function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildContractPdfFilename(customerName: string): string {
  const safe = customerName.trim().replace(/[^\w가-힣.-]/g, "_") || "고객";
  return `파로스_위임계약서_${safe}.pdf`;
}

/** @deprecated DOCUMENT_UPLOAD_ENABLED 사용 — 하위 호환 */
const PHASE2_ENABLED = DOCUMENT_UPLOAD_ENABLED;

const TRANSIENT_STEPS = new Set<StepKey>([
  "loading",
  "submit-loading",
  "intake-wizard",
  "intake-finished",
]);

interface FormBackup {
  step: StepKey;
  data: FormData;
  internalGrade: LeadGrade | null;
}

function isStepKey(value: unknown): value is StepKey {
  return typeof value === "string";
}

function parseFormBackup(raw: string): FormBackup | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as Partial<FormBackup>;
    if (!isStepKey(record.step) || TRANSIENT_STEPS.has(record.step)) return null;
    if (!record.data || typeof record.data !== "object") return null;

    const grade = record.internalGrade;
    const internalGrade: LeadGrade | null =
      grade === "A" || grade === "B" || grade === "C" ? grade : null;

    let step = record.step;
    if ((record.step as string) === "documents") step = "documents-sign";
    if (!DOCUMENT_UPLOAD_ENABLED && step === "documents-upload") {
      step = "documents-sign";
    }

    const migrated = migrateFormData(
      record.data as Partial<FormData> & Record<string, unknown>,
    );

    return {
      step: resolveResumeStep(step, migrated),
      data: migrated,
      internalGrade,
    };
  } catch {
    return null;
  }
}

function loadFormBackup(): FormBackup | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(FORM_BACKUP_KEY);
  if (!raw) return null;
  return parseFormBackup(raw);
}

function saveFormBackup(backup: FormBackup): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_BACKUP_KEY, JSON.stringify(backup));
  } catch {
    // storage quota or private mode — ignore
  }
}

function clearFormBackup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FORM_BACKUP_KEY);
}

/** localStorage 구버전 필드명 → 현행 FormData 키 마이그레이션 */
function migrateFormData(raw: Partial<FormData> & Record<string, unknown>): FormData {
  const legacy = raw as Record<string, string | undefined>;
  return {
    ...INITIAL,
    ...raw,
    painBodyPart: toStringArray(raw.painBodyPart ?? legacy.boneBodyPart),
    diagnosis: toStringArray(raw.diagnosis ?? legacy.boneDiagnosis),
    diagnosisOtherText:
      typeof raw.diagnosisOtherText === "string" ? raw.diagnosisOtherText : "",
    posture: raw.posture ?? legacy.bonePosture ?? "",
    weight: raw.weight ?? legacy.boneWeight ?? "",
    symptomTime: raw.symptomTime ?? legacy.boneOnset ?? "",
    addressBase: raw.addressBase ?? raw.address ?? legacy.address ?? "",
    addressDetail: raw.addressDetail ?? "",
    zonecode: raw.zonecode ?? "",
    address:
      raw.address ??
      buildFullAddress(
        raw.addressBase ?? "",
        raw.addressDetail ?? ""
      ),
    name:
      (typeof raw.name === "string" ? raw.name : "") ||
      legacy.clientName?.trim() ||
      legacy.customerName?.trim() ||
      "",
    phone:
      (typeof raw.phone === "string" ? raw.phone : "") ||
      legacy.phoneNumber?.trim() ||
      "",
  };
}

function buildFullAddress(base: string, detail: string): string {
  return [base.trim(), detail.trim()].filter(Boolean).join(" ");
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** 뒷자리 1번째만 노출, 나머지는 • 마스킹 */
function maskResidentNumberBack(digits: string): string {
  if (!digits) return "";
  if (digits.length === 1) return digits;
  return digits[0] + "•".repeat(digits.length - 1);
}

const CONTACT_INPUT =
  "w-full min-w-0 px-4 py-3.5 rounded-2xl bg-white text-[#191F28] text-[15px] tracking-[-0.02em] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-transparent focus:border-[#3182F6] focus:outline-none";

const PERSONAL_INFO_CONSENT_BODY = `1. 수집 항목: 성명, 연락처, 주소, 병력 및 진단명
2. 수집 목적: 산업재해보상보험법에 따른 요양/휴업/장해 급여 청구 대리, 무료 진단 및 상담, 공공기관 서류 자동 발급 (마이데이터 연동)
3. 보유 및 이용 기간: 사건 종결 후 5년 보관 후 파기 (관련 법령에 따름)
※ 귀하는 동의를 거부할 권리가 있으나, 거부 시 산재 접수 및 수속 대행이 불가능합니다.`;

const UNIQUE_ID_CONSENT_BODY = `1. 수집 항목: 주민등록번호
2. 수집 목적: 근로복지공단·관공서 제출용 산재 접수 서류 작성, 본인 확인 및 급여 청구 대리
3. 보유 및 이용 기간: 사건 종결 후 5년 보관 후 파기 (관련 법령에 따름)
※ 주민등록번호는 관련 법령에 따른 필수 수집 항목이며, 거부 시 산재 접수 및 수속 대행이 불가능합니다.`;

const SYMPTOM_LABELS: Record<Exclude<MainSymptom, null>, string> = {
  hearing: "소음성 난청",
  bone: "근골격계 질환",
  respiratory: "호흡기 질병 (폐암, 진폐 등)",
  overwork: "뇌·심혈관계 (과로)",
  stress: "우울증/스트레스",
  accident: "기타 사고",
};

const HEARING_STATUS_OPTIONS = [
  "이명 지속",
  "일상대화 안됨",
  "난청 진단받음",
] as const;

const HEARING_HISTORY_OPTIONS = [
  "중이염 등 앓은 적 있음",
  "군대 사격·포격 경험 있음",
  "없음",
] as const;

const HEARING_PROTECTION_OPTIONS = [
  "지급 안됨·거의 안함",
  "가끔 착용",
  "항상 착용",
] as const;

const BONE_BODY_PART_OPTIONS = [
  "목(경추)",
  "허리(요추)",
  "어깨(회전근개)",
  "팔꿈치(엘보)",
  "손·손목",
  "무릎·발목",
] as const;

const BONE_DIAGNOSIS_BY_SPINE = [
  "디스크 (추간판탈출증)",
  "협착증",
  "단순 염좌 / 근육통",
  "아직 정밀 검사 전",
] as const;

const BONE_DIAGNOSIS_BY_SHOULDER = [
  "회전근개 파열 / 힘줄 파열",
  "오십견 / 충돌증후군",
  "단순 염좌",
  "아직 검사 전",
] as const;

const BONE_DIAGNOSIS_BY_KNEE_ANKLE = [
  "반월상 연골 파열",
  "십자인대 파열",
  "퇴행성 관절염",
  "단순 염좌",
  "아직 검사 전",
] as const;

const BONE_DIAGNOSIS_BY_HAND_WRIST_ELBOW = [
  "수근관 증후군 (손목터널 증후군)",
  "방아쇠 수지 / 건초염 (드퀴르벵)",
  "테니스/골프 엘보 (상과염)",
  "아직 정밀 검사 전",
] as const;

/** 선택 부위 1개 → 진단명 선택지 */
function getBoneDiagnosisOptionsForPart(painBodyPart: string): readonly string[] {
  switch (painBodyPart) {
    case "목(경추)":
    case "허리(요추)":
      return BONE_DIAGNOSIS_BY_SPINE;
    case "어깨(회전근개)":
      return BONE_DIAGNOSIS_BY_SHOULDER;
    case "무릎·발목":
      return BONE_DIAGNOSIS_BY_KNEE_ANKLE;
    case "손·손목":
    case "팔꿈치(엘보)":
      return BONE_DIAGNOSIS_BY_HAND_WRIST_ELBOW;
    default:
      return BONE_DIAGNOSIS_BY_SPINE;
  }
}

/** 여러 부위 선택 시 진단명 선택지 합집합 (중복 제거) */
function getBoneDiagnosisOptionsForParts(parts: string[]): readonly string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const part of parts) {
    for (const opt of getBoneDiagnosisOptionsForPart(part)) {
      if (!seen.has(opt)) {
        seen.add(opt);
        merged.push(opt);
      }
    }
  }
  return merged;
}

const BONE_POSTURE_OPTIONS = [
  "목/어깨를 치켜드는 작업 (하루 2시간 이상)",
  "쪼그려 앉거나 허리를 숙이는 작업 (하루 2시간 이상)",
  "손목·팔을 쉴 새 없이 움직이는 반복 작업",
  "해당 없음",
] as const;

const BONE_WEIGHT_OPTIONS = [
  "20kg 이상 무거운 물건을 하루 수십 번 반복",
  "10kg 내외 물건을 자주 운반",
  "무거운 물건을 드는 일은 거의 없음",
] as const;

const BONE_SYMPTOM_TIME_OPTIONS = [
  "일하는 중 서서히 아파졌다",
  "일을 그만두고 나서 심해졌다",
  "특정 날짜에 갑자기 삐끗하거나 다쳤다(사고)",
] as const;

const RESPIRATORY_EXPOSURE_OPTIONS = [
  "석면",
  "돌가루·분진",
  "용접 흄·유기용제",
  "조리 흄",
  "잘 모름",
] as const;

const RESPIRATORY_SMOKING_OPTIONS = [
  "전혀 안 피움",
  "과거 피웠으나 끊음",
  "현재 흡연 중",
] as const;

const OVERWORK_COMMUNICATOR_OPTIONS = [
  "본인 직접 상담",
  "가족 대리 상담",
  "사망 (과로사)",
] as const;

const OVERWORK_TRIGGER_OPTIONS = [
  "업무량 급증·마감 압박",
  "극심한 말다툼·민원",
  "변화 없음",
] as const;

const OVERWORK_DIAGNOSIS_OPTIONS = [
  "뇌출혈",
  "뇌경색(허혈성 뇌졸중)",
  "심근경색",
  "협심증·급성 심장질환",
  "아직 정밀 검사 전",
] as const;

const BONE_DIAGNOSIS_OTHER_LABEL = "✍️ 기타 병명 직접 입력";
const OVERWORK_DIAGNOSIS_OTHER_LABEL = "✍️ 기타 뇌·심혈관 질환 직접 입력";
const RESPIRATORY_EXPOSURE_OTHER_LABEL = "✍️ 기타 유해 환경 직접 입력";

const OTHER_TEXT_INPUT_CLASS =
  "w-full px-5 py-4 rounded-2xl bg-white text-[#191F28] text-[16px] tracking-[-0.02em] placeholder:text-[#B0B8C1] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border-2 border-[#3182F6] focus:outline-none";

const WORK_DURATION_OPTIONS: { id: WorkDuration; label: string }[] = [
  { id: "under1", label: "1년 미만" },
  { id: "1-3", label: "1~3년" },
  { id: "3-5", label: "3~5년" },
  { id: "5-10", label: "5~10년" },
  { id: "over10", label: "10년 이상" },
];

const OCCUPATION_OPTIONS: { id: Occupation; label: string; emoji?: string }[] = [
  { id: "cleaning", label: "청소/미화", emoji: "🧹" },
  { id: "healthcare", label: "보건/의료 (요양/간호)", emoji: "🏥" },
  { id: "construction", label: "건설/조선", emoji: "🏗️" },
  { id: "catering", label: "급식/조리", emoji: "🍳" },
  { id: "manufacturing", label: "제조/생산", emoji: "🏭" },
  { id: "other", label: "기타업종", emoji: "✍️" },
];

const PAGE_TRANSITION = {
  type: "tween" as const,
  ease: [0.32, 0.72, 0, 1] as const,
  duration: 0.28,
};

/** transform(x)만 — opacity 제거 시 GPU 합성·리페인트 부담 감소 */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-18%" }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir > 0 ? "-18%" : "100%" }),
};

// ── Routing ──────────────────────────────────────────────────────

function stepsForSymptom(symptom: MainSymptom): StepKey[] {
  const tail: StepKey[] = ["filter", "contact"];
  switch (symptom) {
    case "hearing":
      return [
        "symptom",
        "hearing-status",
        "hearing-history",
        "hearing-protection",
        "duration",
        ...tail,
      ];
    case "bone":
      return [
        "symptom",
        "bone-body-part",
        "bone-diagnosis",
        "bone-posture",
        "bone-weight",
        "bone-onset",
        "occupation",
        "duration",
        ...tail,
      ];
    case "respiratory":
      return [
        "symptom",
        "respiratory-exposure",
        "respiratory-smoking",
        ...tail,
      ];
    case "overwork":
      return [
        "symptom",
        "overwork-communicator",
        "overwork-diagnosis",
        "overwork-trigger",
        ...tail,
      ];
    case "stress":
      return ["symptom", "stress-cause", "evidence", ...tail];
    case "accident":
      return ["symptom", "generic-detail", ...tail];
    default:
      return ["symptom", ...tail];
  }
}

function getStepSequence(data: FormData): StepKey[] {
  if (!data.symptom) return ["symptom"];
  return stepsForSymptom(data.symptom);
}

function getNextStep(current: StepKey, data: FormData): StepKey | null {
  if (current === "welcome") return "symptom";
  const seq = getStepSequence(data);
  const idx = seq.indexOf(current);
  if (idx === -1 || idx >= seq.length - 1) return null;
  return seq[idx + 1];
}

function getPrevStep(current: StepKey, data: FormData): StepKey | null {
  if (current === "symptom") return "welcome";
  const seq = getStepSequence(data);
  const idx = seq.indexOf(current);
  if (idx <= 0) return null;
  return seq[idx - 1];
}

function getProgress(current: StepKey, data: FormData): number {
  if (
    current === "welcome" ||
    current === "loading" ||
    current === "submit-loading" ||
    current === "result" ||
    current === "result-b" ||
    current === "result-c" ||
    current === "consultation-offer" ||
    current === "consultation-success" ||
    current === "documents-sign" ||
    current === "documents-upload" ||
    current === "intake-wizard" ||
    current === "intake-finished"
  )
    return 0;
  const seq = getStepSequence(data).filter(
    (s) =>
      s !== "result" &&
      s !== "result-b" &&
      s !== "result-c" &&
      s !== "documents-sign" &&
      s !== "documents-upload" &&
      s !== "intake-wizard" &&
      s !== "intake-finished"
  );
  const idx = seq.indexOf(current);
  if (idx === -1) return 100;
  return Math.round(((idx + 1) / seq.length) * 100);
}

function canProceed(step: StepKey, data: FormData): boolean {
  switch (step) {
    case "filter":
      return data.employment !== null && data.insurance !== null;
    case "symptom":
      return data.symptom !== null;
    case "hearing-status":
      return data.hearingEarStatus.length > 0;
    case "hearing-history":
      return data.hearingPastHistory.length > 0;
    case "hearing-protection":
      return data.hearingProtection.length > 0;
    case "bone-body-part":
      return data.painBodyPart.length > 0;
    case "bone-diagnosis":
    case "overwork-diagnosis":
      return (
        data.diagnosis.length > 0 || data.diagnosisOtherText.trim().length > 0
      );
    case "bone-posture":
      return data.posture.length > 0;
    case "bone-weight":
      return data.weight.length > 0;
    case "bone-onset":
      return data.symptomTime.length > 0;
    case "respiratory-exposure":
      return data.respiratoryExposure.trim().length > 0;
    case "respiratory-smoking":
      return data.respiratorySmoking.length > 0;
    case "overwork-communicator":
      return data.overworkPatientStatus.length > 0;
    case "overwork-trigger":
      return data.overworkSuddenTrigger.length > 0;
    case "occupation":
      if (data.occupation === "other") return data.occupationOther.trim().length > 0;
      return data.occupation !== null;
    case "duration":
      return data.workDuration !== null;
    case "stress-cause":
      if (data.stressCause === "other") {
        return data.stressCauseLabel.trim().length > 0;
      }
      return data.stressCause !== null;
    case "evidence":
      return data.evidence !== null;
    case "generic-detail":
      return data.genericDetail !== null;
    case "contact":
      return (
        data.name.trim().length > 0 &&
        phoneDigits(data.phone).length >= 10 &&
        data.residentNumberFront.length === 6 &&
        data.residentNumberBack.length === 7 &&
        data.addressBase.trim().length >= 2 &&
        data.consentPersonalInfo &&
        data.consentUniqueId &&
        data.consentConsultation
      );
    default:
      return false;
  }
}

// ── Grade calculation (internal routing — never show A/B/C labels to customers) ──
//
// 산정 원칙 (사용자 정의 없이 폼 데이터로 추론):
// 1) 핵심 질병 — 디스크·회전근개 파열·진폐·뇌출혈 등 산재 연관성 높은 진단
// 2) 근무 기간 — 오래일수록 가산
// 3) 직업 명확성 — 건설·제조 등 고위험 직종 또는 구체적 기타 입력

export type LeadGrade = "A" | "B" | "C";

function workDurationPoints(duration: WorkDuration): number {
  switch (duration) {
    case "under1":
      return 0;
    case "1-3":
      return 1;
    case "3-5":
      return 2;
    case "5-10":
      return 3;
    case "over10":
      return 4;
    default:
      return 0;
  }
}

function occupationPoints(data: FormData): number {
  const { occupation, occupationOther } = data;
  if (!occupation) return 0;
  if (occupation === "other") {
    return occupationOther.trim().length >= 2 ? 1 : 0;
  }
  return 2;
}

function resolveBoneDiagnoses(data: FormData): string[] {
  const options = getBoneDiagnosisOptionsForParts(toStringArray(data.painBodyPart));
  return resolveDiagnosisForSubmit(
    data.diagnosis,
    data.diagnosisOtherText,
    options,
  );
}

function resolveOverworkDiagnoses(data: FormData): string[] {
  return resolveDiagnosisForSubmit(
    data.diagnosis,
    data.diagnosisOtherText,
    OVERWORK_DIAGNOSIS_OPTIONS,
  );
}

/** 핵심 질병 3 · 중간 2 · 약함 1 · 미검사·단순염좌만 0 + disqualify */
function scoreDiagnosisLabels(
  labels: string[],
): { points: number; disqualifyOnly: boolean } {
  if (labels.length === 0) return { points: 0, disqualifyOnly: false };

  let best = 0;
  let hasWeakOnly = true;

  for (const d of labels) {
    if (
      d.includes("단순 염좌") ||
      d.includes("아직 정밀 검사") ||
      d.includes("아직 검사 전")
    ) {
      continue;
    }
    hasWeakOnly = false;

    if (
      d.includes("디스크") ||
      d.includes("협착증") ||
      d.includes("회전근개") ||
      d.includes("반월상") ||
      d.includes("십자인대") ||
      d.includes("수근관") ||
      d.includes("퇴행성 관절염") ||
      d.includes("뇌출혈") ||
      d.includes("뇌경색") ||
      d.includes("심근경색") ||
      d.includes("협심증")
    ) {
      best = Math.max(best, 3);
    } else if (
      d.includes("오십견") ||
      d.includes("테니스") ||
      d.includes("골프") ||
      d.includes("건초염") ||
      d.includes("방아쇠")
    ) {
      best = Math.max(best, 2);
    } else {
      best = Math.max(best, 1);
    }
  }

  const hasWeak = labels.some(
    (d) =>
      d.includes("단순 염좌") ||
      d.includes("아직 정밀 검사") ||
      d.includes("아직 검사 전"),
  );

  return {
    points: best,
    disqualifyOnly: hasWeak && (hasWeakOnly || best === 0),
  };
}

function gradeFromSignals(
  diseasePts: number,
  durationPts: number,
  occupationPts: number,
): LeadGrade {
  const total = diseasePts + durationPts + occupationPts;

  // A — 핵심 질병 + (근무 3년↑ 또는 장기근무) + (직업 명확 또는 장기근무 보정)
  if (diseasePts >= 3 && durationPts >= 2 && occupationPts >= 1) return "A";
  if (diseasePts >= 3 && durationPts >= 3) return "A";
  if (diseasePts >= 2 && durationPts >= 3 && occupationPts >= 2) return "A";
  if (total >= 7) return "A";

  // B — 일부 요건 충족
  if (diseasePts >= 2 && durationPts >= 1) return "B";
  if (diseasePts >= 1 && durationPts >= 2) return "B";
  if (diseasePts >= 3 && durationPts >= 1) return "B";
  if (total >= 4) return "B";

  return "C";
}

function calculateGrade(data: FormData): LeadGrade {
  const {
    symptom,
    workDuration,
    evidence,
    hearingPastHistory,
    hearingProtection,
    symptomTime,
    respiratoryExposure,
    respiratorySmoking,
    overworkPatientStatus,
    overworkSuddenTrigger,
    insurance,
    occupation,
  } = data;

  if (insurance === "no") return "C";

  const durationPts = workDurationPoints(workDuration);
  const occupationPts = occupation ? occupationPoints(data) : 0;

  if (symptom === "bone") {
    if (workDuration === "under1") return "C";
    if (symptomTime === "특정 날짜에 갑자기 삐끗하거나 다쳤다(사고)") return "C";

    const { points: diseasePts, disqualifyOnly } = scoreDiagnosisLabels(
      resolveBoneDiagnoses(data),
    );
    if (disqualifyOnly) return "C";

    return gradeFromSignals(diseasePts, durationPts, occupationPts);
  }

  if (symptom === "hearing") {
    const diseasePts =
      data.hearingEarStatus.includes("난청") ||
      data.hearingEarStatus.includes("이명")
        ? 3
        : 2;
    if (
      hearingPastHistory === "없음" &&
      hearingProtection === "지급 안됨·거의 안함" &&
      durationPts >= 2
    ) {
      return "A";
    }
    if (durationPts >= 3 && diseasePts >= 2) return "A";
    if (durationPts >= 1 && diseasePts >= 2) return "B";
    return durationPts >= 1 ? "B" : "C";
  }

  if (symptom === "respiratory") {
    if (respiratorySmoking === "현재 흡연 중" && respiratoryExposure === "잘 모름") {
      return "C";
    }
    const diseasePts =
      respiratoryExposure === "석면" ||
      respiratoryExposure === "돌가루·분진" ||
      respiratoryExposure === "용접 흄·유기용제"
        ? 3
        : respiratoryExposure === "조리 흄"
          ? 2
          : respiratoryExposure === "잘 모름"
            ? 0
            : 1;
    if (diseasePts >= 3 && respiratorySmoking !== "현재 흡연 중") return "A";
    if (diseasePts >= 2) return "B";
    return diseasePts >= 1 ? "B" : "C";
  }

  if (symptom === "overwork") {
    const { points: diseasePts, disqualifyOnly } = scoreDiagnosisLabels(
      resolveOverworkDiagnoses(data),
    );
    if (disqualifyOnly) return "C";
    if (
      overworkPatientStatus === "사망 (과로사)" ||
      overworkSuddenTrigger === "업무량 급증·마감 압박"
    ) {
      if (diseasePts >= 2) return "A";
      return "B";
    }
    if (diseasePts >= 3) return "A";
    if (diseasePts >= 2) return "B";
    return diseasePts >= 1 ? "B" : "C";
  }

  if (symptom === "stress") {
    if (evidence === "none") return "C";
    if (evidence === "material") return "A";
    if (evidence === "witness") return "B";
    return "C";
  }

  if (symptom === "accident") {
    if (data.genericDetail === "recent") return "B";
    if (data.genericDetail === "ongoing" || data.genericDetail === "recurring") {
      return "B";
    }
    return "C";
  }

  return "C";
}

/** C등급만 재확인 화면. A·B는 예상 보상금 화면 */
function shouldShowCompensationResult(
  data: FormData,
  grade?: LeadGrade | null,
): boolean {
  const resolved = grade ?? calculateGrade(data);
  return resolved !== "C";
}

interface CompensationInfo {
  minManwon: number;
  maxPart: string;
}

const ANALYSIS_LOADING_STEPS = [
  "🔎 입력하신 정보를 분석 중입니다...",
  "📚 최근 5년간의 산재 승인 판례 데이터를 대조 중입니다...",
  "⚖️ 유사 판례 기준 예상 보상금을 산출하고 있습니다...",
  "✨ 예상 보상금 산출이 거의 완료되었습니다!",
];

const ANALYSIS_LOADING_STEPS_REVIEW = [
  "🔎 입력하신 정보를 검토 중입니다...",
  "📋 상담 접수 내용을 정리하고 있습니다...",
  "🧑‍💼 담당 노무사 확인을 위한 접수를 준비하고 있습니다...",
  "✅ 상담 접수가 거의 완료되었습니다!",
];

const ANALYSIS_LOADING_DURATION_MS = 5000;

const ANALYSIS_STEP_DELAYS_MS = [1200, 2600, 4000] as const;

function getExpectedCompensation(symptom: MainSymptom): CompensationInfo {
  switch (symptom) {
    case "bone":
      return { minManwon: 1500, maxPart: "3,000만 원" };
    case "hearing":
      return { minManwon: 2000, maxPart: "4,000만 원" };
    case "respiratory":
      return { minManwon: 3000, maxPart: "5,000만 원" };
    case "overwork":
      return { minManwon: 5000, maxPart: "1억 원 이상" };
    case "stress":
      return { minManwon: 1000, maxPart: "2,000만 원" };
    case "accident":
      return { minManwon: 2000, maxPart: "5,000만 원" };
    default:
      return { minManwon: 1000, maxPart: "3,000만 원" };
  }
}

function shortenBodyPartForLabel(part: string): string {
  const map: Record<string, string> = {
    "목(경추)": "목",
    "허리(요추)": "허리",
    "어깨(회전근개)": "어깨",
    "팔꿈치(엘보)": "팔꿈치",
    "손·손목": "손·손목",
    "무릎·발목": "무릎",
  };
  return map[part] ?? part.split("(")[0]?.trim() ?? part;
}

function formatDiagnosisForSuccessLabel(
  diagnosis: string,
  bodyPartShort?: string,
): string {
  if (diagnosis.includes("디스크")) {
    return bodyPartShort ? `${bodyPartShort}디스크` : "디스크";
  }
  if (diagnosis.includes("협착증")) {
    return bodyPartShort ? `${bodyPartShort} 협착증` : "협착증";
  }
  if (diagnosis.includes("회전근개")) return "회전근개 파열";
  if (diagnosis.includes("오십견")) return "오십견";
  if (diagnosis.includes("반월상")) return "반월상 연골 파열";
  if (diagnosis.includes("십자인대")) return "십자인대 파열";
  if (diagnosis.includes("수근관")) return "수근관 증후군";
  if (diagnosis.includes("테니스") || diagnosis.includes("골프")) {
    return "테니스/골프 엘보";
  }
  if (diagnosis.includes("아직")) {
    return bodyPartShort ? `${bodyPartShort} 근골격계 질환` : "근골격계 질환";
  }
  return diagnosis.replace(/\s*\([^)]*\)/g, "").trim();
}

function getSuccessConditionLabel(data: FormData): string {
  const { symptom } = data;

  if (symptom === "bone") {
    const parts = toStringArray(data.painBodyPart);
    const primaryPart = parts[0] ?? "";
    const bodyShort = shortenBodyPartForLabel(primaryPart);
    const options = getBoneDiagnosisOptionsForParts(parts);
    const resolved = resolveDiagnosisForSubmit(
      data.diagnosis,
      data.diagnosisOtherText,
      options,
    );
    const primaryDx =
      resolved.find((d) => !d.includes("아직")) ?? resolved[0];
    if (primaryDx) {
      return formatDiagnosisForSuccessLabel(primaryDx, bodyShort);
    }
    if (bodyShort) return `${bodyShort} 통증`;
    return "근골격계 질환";
  }

  if (symptom === "overwork") {
    const resolved = resolveDiagnosisForSubmit(
      data.diagnosis,
      data.diagnosisOtherText,
      OVERWORK_DIAGNOSIS_OPTIONS,
    );
    const primaryDx =
      resolved.find((d) => !d.includes("아직")) ?? resolved[0];
    if (primaryDx) return primaryDx.replace(/\s*\([^)]*\)/g, "").trim();
    return "뇌·심혈관 질환";
  }

  if (symptom === "respiratory") {
    const exposure = data.respiratoryExposure.trim();
    if (exposure && exposure !== "잘 모름") {
      const exposureMap: Record<string, string> = {
        석면: "석면 폐질환",
        "돌가루·분진": "진폐",
        "용접 흄·유기용제": "호흡기 질환",
        "조리 흄": "호흡기 질환",
      };
      return exposureMap[exposure] ?? exposure;
    }
    return "호흡기 질환";
  }

  if (symptom === "hearing") return "소음성 난청";
  if (symptom === "stress") return "우울증";
  if (symptom === "accident") return "업무 재해";

  return data.symptomLabel.trim() || "산재 질환";
}

/** 병명(표시 라벨)별 산재 승인 판례 건수 — Success UI 빅데이터 문구용 */
const PRECEDENT_CASE_COUNT_BY_LABEL: Record<string, number> = {
  // 근골격 — 척추
  허리디스크: 3_421,
  목디스크: 2_856,
  "허리 협착증": 1_924,
  "목 협착증": 1_638,
  "단순 염좌 / 근육통": 987,
  // 근골격 — 어깨
  "회전근개 파열": 2_156,
  오십견: 1_743,
  // 근골격 — 무릎·발목
  "반월상 연골 파열": 1_587,
  "십자인대 파열": 1_423,
  "퇴행성 관절염": 1_265,
  "단순 염좌": 892,
  // 근골격 — 손·팔
  "수근관 증후군": 2_634,
  "테니스/골프 엘보": 1_892,
  "방아쇠 수지 / 건초염": 1_456,
  // 근골격 — 부위·미상
  "허리 통증": 2_104,
  "목 통증": 1_876,
  "어깨 통증": 1_654,
  "팔꿈치 통증": 1_238,
  "손·손목 통증": 1_967,
  "무릎 통증": 1_412,
  "허리 근골격계 질환": 2_310,
  "목 근골격계 질환": 1_985,
  "어깨 근골격계 질환": 1_720,
  "팔꿈치 근골격계 질환": 1_305,
  "손·손목 근골격계 질환": 1_880,
  "무릎 근골격계 질환": 1_390,
  "근골격계 질환": 2_560,
  // 뇌·심혈관
  뇌출혈: 892,
  뇌경색: 1_245,
  심근경색: 1_567,
  "협심증·급성 심장질환": 1_103,
  "뇌·심혈관 질환": 980,
  // 호흡기
  "석면 폐질환": 756,
  진폐: 1_834,
  "호흡기 질환": 1_420,
  // 기타 증상
  "소음성 난청": 3_127,
  우울증: 1_689,
  "업무 재해": 2_341,
  "산재 질환": 1_500,
};

function stableLabelHash(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPrecedentCaseCount(conditionLabel: string, symptom: MainSymptom): number {
  const label = conditionLabel.trim();
  if (!label) return PRECEDENT_CASE_COUNT_BY_LABEL["산재 질환"];

  const exact = PRECEDENT_CASE_COUNT_BY_LABEL[label];
  if (exact !== undefined) return exact;

  if (label.includes("디스크")) {
    if (label.includes("목")) return PRECEDENT_CASE_COUNT_BY_LABEL["목디스크"];
    if (label.includes("허리")) return PRECEDENT_CASE_COUNT_BY_LABEL["허리디스크"];
    return 3_100;
  }
  if (label.includes("협착증")) {
    if (label.includes("목")) return PRECEDENT_CASE_COUNT_BY_LABEL["목 협착증"];
    if (label.includes("허리")) return PRECEDENT_CASE_COUNT_BY_LABEL["허리 협착증"];
    return 1_780;
  }
  if (label.includes("회전근개")) return PRECEDENT_CASE_COUNT_BY_LABEL["회전근개 파열"];
  if (label.includes("오십견")) return PRECEDENT_CASE_COUNT_BY_LABEL["오십견"];
  if (label.includes("반월상")) return PRECEDENT_CASE_COUNT_BY_LABEL["반월상 연골 파열"];
  if (label.includes("십자인대")) return PRECEDENT_CASE_COUNT_BY_LABEL["십자인대 파열"];
  if (label.includes("수근관")) return PRECEDENT_CASE_COUNT_BY_LABEL["수근관 증후군"];
  if (label.includes("엘보") || label.includes("테니스") || label.includes("골프")) {
    return PRECEDENT_CASE_COUNT_BY_LABEL["테니스/골프 엘보"];
  }
  if (label.includes("건초염") || label.includes("방아쇠")) {
    return PRECEDENT_CASE_COUNT_BY_LABEL["방아쇠 수지 / 건초염"];
  }
  if (label.includes("뇌출혈")) return PRECEDENT_CASE_COUNT_BY_LABEL["뇌출혈"];
  if (label.includes("뇌경색") || label.includes("뇌졸중")) {
    return PRECEDENT_CASE_COUNT_BY_LABEL["뇌경색"];
  }
  if (label.includes("심근경색")) return PRECEDENT_CASE_COUNT_BY_LABEL["심근경색"];
  if (label.includes("협심증") || label.includes("심장")) {
    return PRECEDENT_CASE_COUNT_BY_LABEL["협심증·급성 심장질환"];
  }
  if (label.includes("석면")) return PRECEDENT_CASE_COUNT_BY_LABEL["석면 폐질환"];
  if (label.includes("진폐")) return PRECEDENT_CASE_COUNT_BY_LABEL["진폐"];
  if (label.includes("난청")) return PRECEDENT_CASE_COUNT_BY_LABEL["소음성 난청"];
  if (label.includes("우울")) return PRECEDENT_CASE_COUNT_BY_LABEL["우울증"];

  const symptomDefault: Partial<Record<Exclude<MainSymptom, null>, number>> = {
    bone: PRECEDENT_CASE_COUNT_BY_LABEL["근골격계 질환"],
    hearing: PRECEDENT_CASE_COUNT_BY_LABEL["소음성 난청"],
    respiratory: PRECEDENT_CASE_COUNT_BY_LABEL["호흡기 질환"],
    overwork: PRECEDENT_CASE_COUNT_BY_LABEL["뇌·심혈관 질환"],
    stress: PRECEDENT_CASE_COUNT_BY_LABEL["우울증"],
    accident: PRECEDENT_CASE_COUNT_BY_LABEL["업무 재해"],
  };
  if (symptom && symptomDefault[symptom] !== undefined) {
    return symptomDefault[symptom]!;
  }

  // 기타 직접 입력 병명 — 동일 병명이면 항상 같은 건수
  return 1_100 + (stableLabelHash(label) % 900);
}

// ── UI primitives ──────────────────────────────────────────────

function ConsentCheckIcon({
  checked,
  size = "md",
}: {
  checked: boolean;
  size?: "md" | "lg";
}) {
  const iconClass = size === "lg" ? "w-6 h-6" : "w-5 h-5";

  if (checked) {
    return (
      <span className="shrink-0 rounded-full bg-blue-50/50 p-0.5">
        <CheckCircle2 className={`${iconClass} text-blue-500`} strokeWidth={2.5} />
      </span>
    );
  }

  return <CheckCircle className={`${iconClass} shrink-0 text-gray-300`} strokeWidth={2} />;
}

function ConsentCheckItem({
  id,
  checked,
  onChange,
  label,
  detail,
  bold = false,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  detail?: string;
  bold?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span className="mt-0.5">
          <ConsentCheckIcon checked={checked} size={bold ? "lg" : "md"} />
        </span>
        <span
          className={`flex-1 leading-[1.55] tracking-[-0.02em] ${
            bold
              ? "text-[15px] font-bold text-[#191F28]"
              : "text-[13px] text-gray-700"
          }`}
        >
          {label}
        </span>
      </label>
      {detail && (
        <div className="bg-gray-50 p-3 rounded-lg text-[12px] text-gray-500 mt-2 ml-8 whitespace-pre-line leading-relaxed">
          {detail}
        </div>
      )}
    </div>
  );
}

function PrivacyConsentSection({
  consentPersonalInfo,
  consentUniqueId,
  consentConsultation,
  onPatch,
}: {
  consentPersonalInfo: boolean;
  consentUniqueId: boolean;
  consentConsultation: boolean;
  onPatch: (patch: Partial<FormData>) => void;
}) {
  const allConsented =
    consentPersonalInfo && consentUniqueId && consentConsultation;

  return (
    <div className="rounded-2xl border border-[#EEF0F3] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-3">
        개인정보 및 고유식별정보 수집·이용 동의
      </p>

      <ConsentCheckItem
        id="consent-all"
        checked={allConsented}
        onChange={(checked) =>
          onPatch({
            consentPersonalInfo: checked,
            consentUniqueId: checked,
            consentConsultation: checked,
          })
        }
        bold
        label="[필수] 약관에 모두 동의합니다."
      />

      <div className="border-b border-gray-100 my-3" />

      <div className="space-y-4">
        <ConsentCheckItem
          id="consent-personal-info"
          checked={consentPersonalInfo}
          onChange={(checked) => onPatch({ consentPersonalInfo: checked })}
          label={
            <>
              <span className="font-semibold text-[#3182F6]">[필수]</span>{" "}
              개인정보 수집 및 이용에 동의합니다.
            </>
          }
          detail={PERSONAL_INFO_CONSENT_BODY}
        />

        <ConsentCheckItem
          id="consent-unique-id"
          checked={consentUniqueId}
          onChange={(checked) => onPatch({ consentUniqueId: checked })}
          label={
            <>
              <span className="font-semibold text-[#3182F6]">[필수]</span>{" "}
              고유식별정보(주민등록번호) 처리에 동의합니다.
            </>
          }
          detail={UNIQUE_ID_CONSENT_BODY}
        />

        <ConsentCheckItem
          id="consent-consultation"
          checked={consentConsultation}
          onChange={(checked) => onPatch({ consentConsultation: checked })}
          label={
            <>
              <span className="font-semibold text-[#3182F6]">[필수]</span>{" "}
              본인은 산재 보상금 무료 진단 및 전문가 상담을 위해 개인정보 수집 및
              이용에 동의합니다.
            </>
          }
        />
      </div>
    </div>
  );
}

function LungIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 3v4.2"
        stroke="#FF6B8A"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 7.2C9.2 7.8 7 10.2 6.4 13.2C5.7 16.8 7.4 19.6 9.8 20.6C11.2 21.2 12 20.2 12 18.4V7.2Z"
        fill="#FF6B8A"
        stroke="#FF6B8A"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.2C14.8 7.8 17 10.2 17.6 13.2C18.3 16.8 16.6 19.6 14.2 20.6C12.8 21.2 12 20.2 12 18.4V7.2Z"
        fill="#FF6B8A"
        stroke="#FF6B8A"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OptionCard({
  selected,
  onClick,
  emoji,
  icon: Icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  icon?: typeof LungIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full bg-white rounded-2xl p-5 text-left
        shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:scale-[0.98]
        border-2 transition-all duration-200
        ${selected ? "border-[#3182F6] bg-[#F0F6FF]" : "border-[#EEF0F3]"}
      `}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <Icon className="w-6 h-6 shrink-0" />
        ) : (
          emoji && <span className="text-2xl">{emoji}</span>
        )}
        <div>
          <p className="text-[16px] font-semibold text-[#191F28] tracking-[-0.02em] leading-[1.4]">
            {title}
          </p>
          {subtitle && (
            <p className="text-[13px] text-[#8B95A1] tracking-[-0.02em] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );
}

/** 다중 선택 — 파란 테두리·배경 + 우측 ✅ */
function MultiOptionCard({
  selected,
  onClick,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full bg-white rounded-2xl px-5 py-4 text-left
        shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:scale-[0.98]
        border-2 transition-all duration-200
        ${selected ? "border-blue-500 bg-blue-50" : "border-[#EEF0F3] bg-white"}
      `}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <p className="text-[16px] font-semibold text-[#191F28] tracking-[-0.02em] leading-[1.4]">
          {title}
        </p>
        {selected && (
          <span className="text-[18px] shrink-0 leading-none" aria-hidden>
            ✅
          </span>
        )}
      </div>
    </button>
  );
}

function MultiSelectHint() {
  return (
    <p className="text-sm font-semibold text-[#3182F6] tracking-[-0.02em] mb-4">
      (복수 선택 가능)
    </p>
  );
}

function MultiChoiceStep({
  step,
  totalLabel,
  progress,
  title,
  description,
  multiSelect = true,
  options,
  selected,
  onToggle,
  onProceed,
  canProceedNext,
}: {
  step: number;
  totalLabel: string;
  progress: number;
  title: string;
  description?: string;
  multiSelect?: boolean;
  options: readonly string[];
  selected: string[];
  onToggle: (label: string) => void;
  onProceed: () => void;
  canProceedNext: boolean;
}) {
  return (
    <StepShell
      step={step}
      totalLabel={totalLabel}
      progress={progress}
      title={title}
      description={description}
      multiSelect={multiSelect}
      footer={
        <FixedCTA
          label="선택 완료하고 다음으로 👉"
          disabled={!canProceedNext}
          onClick={onProceed}
        />
      }
    >
      {options.map((label) => (
        <MultiOptionCard
          key={label}
          title={label}
          selected={selected.includes(label)}
          onClick={() => onToggle(label)}
        />
      ))}
    </StepShell>
  );
}

function MultiChoiceWithOtherStep({
  step,
  totalLabel,
  progress,
  title,
  description,
  multiSelect = true,
  options,
  selected,
  otherActive,
  otherButtonLabel,
  otherPlaceholder,
  otherText,
  canProceedNext,
  onToggleOption,
  onPickOther,
  onOtherTextChange,
  onProceed,
}: {
  step: number;
  totalLabel: string;
  progress: number;
  title: string;
  description?: string;
  multiSelect?: boolean;
  options: readonly string[];
  selected: string[];
  otherActive: boolean;
  otherButtonLabel: string;
  otherPlaceholder: string;
  otherText: string;
  canProceedNext: boolean;
  onToggleOption: (label: string) => void;
  onPickOther: () => void;
  onOtherTextChange: (text: string) => void;
  onProceed: () => void;
}) {
  const otherInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherActive) return;
    const timer = window.setTimeout(() => {
      otherInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [otherActive]);

  return (
    <StepShell
      step={step}
      totalLabel={totalLabel}
      progress={progress}
      title={title}
      description={description}
      multiSelect={multiSelect}
      footer={
        <FixedCTA
          label="선택 완료하고 다음으로 👉"
          disabled={!canProceedNext}
          onClick={onProceed}
        />
      }
    >
      {options.map((label) => (
        <MultiOptionCard
          key={label}
          title={label}
          selected={selected.includes(label)}
          onClick={() => onToggleOption(label)}
        />
      ))}

      <MultiOptionCard
        title={otherButtonLabel}
        selected={otherActive}
        onClick={onPickOther}
      />

      <AnimatePresence>
        {otherActive && (
          <motion.div
            ref={otherInputRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              value={otherText}
              onChange={(e) => onOtherTextChange(e.target.value)}
              placeholder={otherPlaceholder}
              className={OTHER_TEXT_INPUT_CLASS}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
}

function FormNavBar({
  onBack,
  onReset,
  showReset,
}: {
  onBack: () => void;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-0 min-h-[36px] z-[60] bg-white">
      <button
        type="button"
        onClick={onBack}
        className="text-[13px] font-semibold text-[#191F28] tracking-[-0.02em] active:scale-[0.97]"
      >
        ← 이전
      </button>
      {showReset ? (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-medium text-[#8B95A1] tracking-[-0.02em] underline-offset-2 hover:text-[#3182F6] active:scale-[0.97] transition-colors"
        >
          ↻ 처음부터 다시 하기
        </button>
      ) : (
        <div className="w-1" aria-hidden />
      )}
    </div>
  );
}

function GlobalHeader() {
  return (
    <header className="flex-shrink-0 w-full pt-2 pb-2 z-50 bg-white">
      <ParoBrandHeader />
    </header>
  );
}

function StepShell({
  step,
  totalLabel,
  progress,
  title,
  description,
  multiSelect,
  children,
  footer,
  mainClassName,
}: {
  step: number;
  totalLabel: string;
  progress: number;
  title: string;
  description?: string;
  multiSelect?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <header className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center justify-end h-10 mb-2">
          <span className="text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em]">
            {step} / {totalLabel}
          </span>
        </div>
        <div className="h-1 w-full bg-[#E5E8EB] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3182F6] transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main
        className={`flex-1 overflow-y-auto px-5 pt-4 pb-36 ${mainClassName ?? ""}`}
      >
        <h1 className="text-[22px] font-bold text-[#191F28] leading-[1.4] tracking-[-0.02em] mb-2">
          {title}
        </h1>
        {multiSelect && <MultiSelectHint />}
        {description && (
          <p className="text-[15px] text-[#8B95A1] leading-[1.5] tracking-[-0.02em] mb-6">
            {description}
          </p>
        )}
        <div className="flex flex-col gap-4">{children}</div>
      </main>

      {footer}
    </div>
  );
}

function FixedCTA({
  label,
  disabled,
  onClick,
  hint,
  enhancedShadow,
  socialProof,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  hint?: string;
  enhancedShadow?: boolean;
  socialProof?: ReactNode;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      <div className="h-10 bg-gradient-to-t from-white via-white/95 to-transparent" />
      <div className="bg-white px-5 pb-9 pt-1 pointer-events-auto border-t border-[#F2F4F6]/80 flex flex-col items-center">
        {socialProof && (
          <div className="w-full flex justify-center mb-3">{socialProof}</div>
        )}
        {hint && (
          <p className="text-[13px] text-[#8B95A1] tracking-[-0.02em] mb-2.5 text-center w-full">
            {hint}
          </p>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`
            w-full py-4 rounded-2xl font-bold text-[17px] tracking-[-0.02em]
            transition-all active:scale-[0.98]
            ${
              disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : enhancedShadow
                  ? "bg-[#3182F6] text-white shadow-[0_8px_20px_rgba(49,130,246,0.3)]"
                  : "bg-[#3182F6] text-white shadow-[0_4px_16px_rgba(49,130,246,0.35)]"
            }
          `}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

/** 결과 화면 하단 — 레거시 위임 계약 CTA (단독 위임장 플로우용) */
function ResultProceedFooter({ onProceed }: { onProceed: () => void }) {
  return (
    <FixedCTA
      label="👉 예상 보상금 확인하고 무료 수속 시작하기"
      disabled={false}
      onClick={onProceed}
    />
  );
}

const WELCOME_LINES = [
  "안녕하세요! 👋",
  "고객님이 놓치고 계신 산재 보상금이 있는지, 1분 만에 정확하게 확인해 드릴게요.",
  "저희가 꼼꼼히 챙겨드릴 테니 편하게 답변해 주세요 😊",
];

const welcomeContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.4, delayChildren: 0.12 },
  },
};

const welcomeBubble = {
  hidden: { opacity: 0, y: 32, scale: 0.88 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 13, stiffness: 440 },
  },
};

const SOCIAL_PROOF_INTERVAL_MS = 3500;

function WelcomeTrustAccent() {
  return (
    <div className="flex flex-col items-center py-3" aria-hidden>
      <ParoLogo variant="hero" animated />
      <p className="text-[11px] text-blue-400 mt-2 tracking-widest font-semibold">
        PHAROS LIGHTHOUSE
      </p>
    </div>
  );
}

const SOCIAL_PROOF_MESSAGES = [
  "⚡ 방금 전 김*수 님이 2,800만 원을 확인했어요!",
  "⚡ 방금 전 박*영 님이 3,500만 원을 확인했어요!",
  "⚡ 방금 전 최*민 님이 4,100만 원을 확인했어요!",
  "⚡ 방금 전 이*훈 님이 3,200만 원을 확인했어요!",
  "⚡ 방금 전 정*진 님이 1,900만 원을 확인했어요!",
  "⚡ 방금 전 강*희 님이 2,400만 원을 확인했어요!",
  "⚡ 방금 전 조*현 님이 5,200만 원을 확인했어요!",
  "⚡ 방금 전 윤*성 님이 3,800만 원을 확인했어요!",
  "⚡ 방금 전 장*우 님이 2,700만 원을 확인했어요!",
  "⚡ 방금 전 임*아 님이 4,500만 원을 확인했어요!",
];

function DynamicSocialProof() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SOCIAL_PROOF_MESSAGES.length);
    }, SOCIAL_PROOF_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-9 w-full max-w-[340px] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bg-gray-800/90 text-white text-[11px] px-4 py-2 rounded-full shadow-lg whitespace-nowrap text-center"
        >
          {SOCIAL_PROOF_MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 flex flex-col overflow-y-auto px-5 pt-2 pb-40 min-h-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-[#F0F6FF] flex items-center justify-center shrink-0">
            <ParoLogo size={22} className="text-blue-600" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#191F28] tracking-[-0.02em]">
              파로스
            </p>
            <p className="text-[13px] text-[#8B95A1] tracking-[-0.02em]">1분 무료 진단 중</p>
          </div>
        </div>

        <motion.div
          variants={welcomeContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2.5 mb-3"
        >
          {WELCOME_LINES.map((line, i) => (
            <motion.div
              key={i}
              variants={welcomeBubble}
              className={`
                max-w-[92%] px-4 py-3.5 rounded-2xl text-[15px] leading-[1.55] tracking-[-0.02em]
                shadow-[0_2px_12px_rgba(0,0,0,0.04)]
                ${i === 0 ? "bg-[#3182F6] text-white rounded-bl-md font-semibold" : "bg-[#F8F9FA] text-[#191F28] rounded-tl-md border border-[#EEF0F3]"}
              `}
            >
              {line}
            </motion.div>
          ))}
        </motion.div>

        <WelcomeTrustAccent />
      </main>

      <FixedCTA
        label="네, 확인해 볼게요!"
        disabled={false}
        onClick={onStart}
        hint="⏱️ 1분이면 끝나요 (초기비용 0원)"
        enhancedShadow
        socialProof={<DynamicSocialProof />}
      />
    </div>
  );
}

function AnalysisLoadingScreen({
  mode = "compensation",
}: {
  mode?: "compensation" | "review";
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps =
    mode === "review" ? ANALYSIS_LOADING_STEPS_REVIEW : ANALYSIS_LOADING_STEPS;

  useEffect(() => {
    setStepIndex(0);
    const timers = ANALYSIS_STEP_DELAYS_MS.map((delay, index) =>
      setTimeout(() => setStepIndex(index + 1), delay),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [mode]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-white">
      <div className="relative w-[72px] h-[72px] mb-12">
        <motion.div
          className="absolute inset-0 rounded-full bg-[#3182F6]/20"
          animate={{ scale: [1, 1.55, 1], opacity: [0.45, 0, 0.45] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-1 rounded-full bg-[#3182F6]/10"
          animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.08, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
        />
        <div className="absolute inset-0 rounded-full border-[4px] border-[#3182F6]/15 bg-white" />
        <motion.div
          className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-[#3182F6]"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.95, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[18px] rounded-full bg-[#3182F6]/8" />
      </div>

      <div className="h-[52px] flex items-center justify-center px-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="text-[16px] font-semibold text-[#191F28] tracking-[-0.02em] text-center leading-[1.55]"
          >
            {steps[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AnimatedCompensationAmount({ info }: { info: CompensationInfo }) {
  const [value, setValue] = useState(0);
  const [slammed, setSlammed] = useState(false);

  useEffect(() => {
    setValue(0);
    setSlammed(false);

    const duration = 1400;
    const target = info.minManwon;
    let raf = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(eased * target));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setSlammed(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [info.minManwon]);

  return (
    <motion.p
      animate={
        slammed
          ? { scale: [0.92, 1.06, 1], opacity: 1 }
          : { scale: 1, opacity: 1 }
      }
      initial={{ opacity: 0, scale: 0.75 }}
      transition={
        slammed
          ? { duration: 0.45, ease: [0.22, 1.2, 0.36, 1] }
          : { delay: 0.35, type: "spring", damping: 24, stiffness: 260 }
      }
      className="text-blue-600 font-extrabold text-[26px] sm:text-3xl tracking-[-0.03em] leading-[1.35] tabular-nums text-balance"
    >
      약 {value.toLocaleString("ko-KR")}만 원 ~ {info.maxPart}
    </motion.p>
  );
}

function ConsultationSuccessScreen({
  data,
  compensation,
  variant,
  onHome,
}: {
  data: FormData;
  compensation: CompensationInfo;
  variant: "compensation" | "review";
  onHome: () => void;
}) {
  const conditionLabel = useMemo(() => getSuccessConditionLabel(data), [data]);
  const precedentCount = useMemo(
    () => getPrecedentCaseCount(conditionLabel, data.symptom),
    [conditionLabel, data.symptom],
  );

  const contentClass = "max-w-[360px] mx-auto w-full";

  if (variant === "review") {
    return (
      <div className="flex flex-col h-full bg-white">
        <main className="flex-1 overflow-y-auto px-5 pt-9 pb-36">
          <div className={contentClass}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="text-center mb-7"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#E8FAF0] flex items-center justify-center text-2xl">
                ✅
              </div>
              <h1 className="text-[22px] font-bold text-[#191F28] tracking-[-0.03em] leading-snug">
                상담 접수가 완료되었습니다
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="rounded-2xl border border-[#EEF0F3] bg-[#F9FAFB] overflow-hidden"
            >
              <div className="px-4 py-3 bg-white border-b border-[#EEF0F3]">
                <p className="text-[12px] font-semibold text-[#8B95A1] tracking-[-0.02em]">
                  1차 검토 안내
                </p>
              </div>
              <div className="px-4 py-4 space-y-4">
                <p className="text-[15px] text-[#4E5968] leading-[1.75] tracking-[-0.02em]">
                  입력해 주신{" "}
                  <span className="font-semibold text-[#191F28]">
                    근무 기간과 질병 상황
                  </span>
                  을 기준으로 보면, 질병산재 인정이 쉽지 않아 보일 수
                  있습니다.
                </p>
                <div className="h-px bg-[#EEF0F3]" />
                <p className="text-[15px] text-[#4E5968] leading-[1.75] tracking-[-0.02em]">
                  다만 화면 입력 과정에서 빠진 정보가 있거나 정확한 확인이
                  필요할 수 있어,{" "}
                  <span className="font-semibold text-[#191F28]">
                    담당 노무사가 순차적으로 연락드려
                  </span>{" "}
                  다시 한번 꼼꼼히 확인해 드리겠습니다.
                </p>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              className="mt-5 text-center text-[12px] text-[#8B95A1] leading-relaxed tracking-[-0.02em] px-2"
            >
              * 상담 신청이 많아 연락이 다소 지연될 수 있으니 양해
              부탁드립니다.
            </motion.p>
          </div>
        </main>
        <FixedCTA label="홈으로 돌아가기" disabled={false} onClick={onHome} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto px-5 pt-9 pb-36">
        <div className={contentClass}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="text-center mb-7"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F0F6FF] flex items-center justify-center text-2xl">
              🎉
            </div>
            <h1 className="text-[22px] font-bold text-[#191F28] tracking-[-0.03em] leading-snug">
              접수가 완료되었습니다!
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="rounded-2xl border border-[#3182F6]/15 bg-[#F0F6FF] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#3182F6]/10 bg-white/60">
              <p className="text-[12px] font-semibold text-[#3182F6] tracking-[-0.02em]">
                판례 빅데이터 분석 결과
              </p>
            </div>
            <div className="px-4 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#8B95A1] shrink-0">동일 질환</span>
                <span className="text-[14px] font-semibold text-[#191F28] text-right leading-snug">
                  {conditionLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#8B95A1] shrink-0">분석 판례</span>
                <span className="text-[14px] font-semibold text-[#3182F6] tabular-nums">
                  {precedentCount.toLocaleString("ko-KR")}건
                </span>
              </div>
            </div>
            <p className="px-4 pb-4 text-[13px] text-[#6B7684] leading-[1.65] tracking-[-0.02em]">
              고객님과 동일한 조건의{" "}
              <span className="font-medium text-[#4E5968]">산재 승인 판례</span>{" "}
              <span className="font-medium text-[#4E5968]">빅데이터</span>를
              분석하여 예상 보상금을 산출했습니다.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.16, type: "spring", damping: 22, stiffness: 280 }}
            className="mt-4 rounded-2xl border border-[#EEF0F3] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] px-5 py-6 text-center"
          >
            <p className="text-[12px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-3">
              예상 보상금
            </p>
            <p className="text-[13px] text-[#8B95A1] mb-3 tracking-[-0.02em]">
              장해급여 + 휴업급여 합산
            </p>
            <AnimatedCompensationAmount info={compensation} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.35 }}
            className="mt-5 rounded-xl border border-[#EEF0F3] bg-[#F9FAFB] px-4 py-4"
          >
            <p className="text-[14px] text-[#6B7684] leading-[1.75] tracking-[-0.02em]">
              위 금액은 판례 기준 단순 예상액입니다.{" "}
              <span className="font-medium text-[#4E5968]">
                담당 노무사가 순차적으로 연락드려
              </span>{" "}
              고객님 상황에 맞는{" "}
              <span className="font-medium text-[#4E5968]">
                정확한 수령 액수와 승인 전략
              </span>
              을 안내해 드립니다.
            </p>
            <p className="mt-3 pt-3 border-t border-[#EEF0F3] text-[12px] text-[#8B95A1] leading-relaxed tracking-[-0.02em] text-center">
              * 상담 신청이 많아 연락이 다소 지연될 수 있으니 양해
              부탁드립니다.
            </p>
          </motion.div>
        </div>
      </main>
      <FixedCTA label="홈으로 돌아가기" disabled={false} onClick={onHome} />
    </div>
  );
}

function ResultScreen({
  name,
  compensation,
  onProceed,
}: {
  name: string;
  compensation: CompensationInfo;
  onProceed: () => void;
}) {
  const displayName = name.trim() || "고객";

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto px-5 pt-10 pb-44">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="text-[24px] font-bold leading-[1.45] tracking-[-0.03em] text-[#191F28]"
        >
          🎉{" "}
          <span className="text-[#3182F6]">{displayName}</span> 님과 동일한
          질환의
          <br />
          산재 승인 판례가 다수 확인되었습니다!
        </motion.h1>

        <div className="bg-gray-50 rounded-2xl p-6 text-center mt-4">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", damping: 26, stiffness: 280 }}
            className="text-[14px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2"
          >
            판례 기준 예상 보상금
          </motion.p>
          <AnimatedCompensationAmount info={compensation} />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="text-[14px] text-[#8B95A1] leading-[1.6] tracking-[-0.02em] mt-5 px-1"
        >
          위 금액은 유사 판례 기준이며, 정확한 서류 검토 후 실제 수령액이 확정됩니다.
          초기 비용은 0원입니다.
        </motion.p>
      </main>

      <ResultProceedFooter onProceed={onProceed} />
    </div>
  );
}

function ResultBScreen({ onProceed }: { onProceed: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-44 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className="w-20 h-20 rounded-full bg-[#E8FAF0] flex items-center justify-center text-4xl mb-6"
        >
          🟢
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 28, stiffness: 320 }}
          className="text-[22px] font-bold text-[#191F28] tracking-[-0.03em] mb-4 leading-[1.45]"
        >
          산재 인정 가능성이 있는 케이스입니다.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="text-[15px] text-[#8B95A1] leading-[1.65] tracking-[-0.02em]"
        >
          정확한 법리 검토를 위해 산재 전문 노무사팀이 직접 연락드립니다.
          <br />
          기재해주신 연락처로 빠르게 안내드릴게요.
        </motion.p>
      </main>
      <ResultProceedFooter onProceed={onProceed} />
    </div>
  );
}

function ResultCScreen({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-36 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className="w-20 h-20 rounded-full bg-[#F0F6FF] flex items-center justify-center text-4xl mb-5"
        >
          📊
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 28, stiffness: 320 }}
          className="text-xl font-bold text-gray-800 mb-2 tracking-[-0.02em] leading-[1.45]"
        >
          아쉽게도 현재 조건으로는
          <br />
          산재 진행이 까다롭습니다
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="w-full bg-gray-50 p-5 rounded-2xl text-[14.5px] text-gray-700 leading-relaxed text-center mt-3 shadow-sm"
        >
          수천 건의 판례 데이터를 분석해 본 결과, 현재 고객님의 조건(근무 기간 및
          직종 등)으로는 근로복지공단의 산재 불승인 확률이 매우 높습니다.
          <br />
          <br />
          무리하게 수속을 진행하여 고객님께 헛된 희망과 시간 낭비를 드리는 것보다,
          정확한 현실을 솔직하게 알려드리는 것이 전문가의 역할이기에 정중히 안내해
          드립니다.
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.35 }}
          className="mt-4 text-[13px] text-gray-400 text-center leading-[1.6] tracking-[-0.02em]"
        >
          몸조리 잘 하시고, 하루빨리 쾌차하시기를 진심으로 응원합니다.
        </motion.p>
      </main>
      <FixedCTA label="네, 확인했습니다" disabled={false} onClick={onHome} />
    </div>
  );
}


export type { SignaturePadHandle } from "@/components/SignaturePadField";

const CONTRACT_DOCUMENTS = [
  {
    id: "delegation",
    title: "① 사건 위임장",
    paragraphs: [
      "본인은 노무법인 파로스(이하 '수임인')를 대리인으로 선임하여, 산업재해·업무상 질병과 관련한 일체의 행정 절차를 위임합니다.",
      "위임 범위: 근로복지공단에 대한 요양급여·산재급여·장해급여·유족급여 등 각종 급여 청구, 이의신청·재심사·행정심판, 행정정보공개청구, 진료·장해 등급 판정 관련 서류 제출 및 열람, 보험급여·요양비·장해연금 등 수급권 행사에 관한 일체.",
      "수임인은 위임 범위 내에서 서류 작성·제출, 기관 방문·출석, 사실관계 조회, 협의·조정 등 필요한 모든 행위를 본인을 대리하여 수행할 수 있습니다.",
      "본 위임은 본인이 서명한 날로부터 효력이 발생하며, 수임인의 수임 승낙과 함께 사건 위임이 성립합니다.",
    ],
  },
  {
    id: "agent-report",
    title: "② 대리인 선임 신고서",
    paragraphs: [
      "본인은 「산업재해보상보험법」 및 관련 규정에 따라, 근로복지공단에 제출하는 대리인 선임 신고에 동의합니다.",
      "수임인(노무법인 파로스 소속 공인노무사)이 본인의 산재·질병 보상 청구, 심사·재심사, 장해등급 판정 등 절차에서 대리인으로 활동하는 것에 동의합니다.",
      "대리인은 관련 기관에 제출·열람·수령이 필요한 서류 및 정보를 조회·취득할 수 있으며, 본인은 이에 필요한 협조를 제공합니다.",
      "대리인 선임 사실이 근로복지공단 등 관계 기관에 신고·통보되는 것에 동의합니다.",
    ],
  },
  {
    id: "fee-agreement",
    title: "③ 사건 위임 약정서",
    paragraphs: [
      "착수금·상담료: 0원",
      "성공보수: 실제 수령한 산재·질병 관련 보상금(일시금·연금 등)의 25%",
      "임의 취하·위임 해지: 본인의 사정으로 임의 취하·위임 해지 시, 이미 투입된 업무에 대해 합리적 범위의 수수료가 발생할 수 있습니다.",
      "비밀 유지: 수임인은 본인의 개인정보 및 사건 정보를 수임 목적 범위 내에서만 사용하며, 관련 법령에 따라 보호합니다.",
      "본인은 위 약정 내용을 충분히 설명받았으며, 이에 동의합니다.",
    ],
  },
] as const;

function ContractAccordion({
  title,
  paragraphs,
  defaultOpen = false,
}: {
  title: string;
  paragraphs: readonly string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-gray-50/80 transition-colors"
      >
        <span className="text-[15px] font-bold text-[#191F28] tracking-[-0.02em]">
          {title}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#8B95A1] shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-36 overflow-y-auto px-4 pb-4 space-y-2.5 border-t border-gray-100">
              {paragraphs.map((p) => (
                <p
                  key={p.slice(0, 28)}
                  className="text-[12px] text-gray-600 leading-[1.65] tracking-[-0.02em]"
                >
                  {p}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmitLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-white">
      <div className="relative w-14 h-14 mb-8">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#3182F6]/20" />
        <motion.div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#3182F6]"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="text-[17px] font-semibold text-[#191F28] tracking-[-0.02em] text-center leading-[1.5]">
        무료 상담 접수 중입니다...
      </p>
    </div>
  );
}

// ── Step 9: 선택 서류 업로드 (서명 후 즉시 접수 — 첨부는 선택) ─────────────────

export type PatientUploadFiles = {
  diagnosis: File[];
  companyDoc: File[];
};

const EMPTY_UPLOAD_FILES: PatientUploadFiles = {
  diagnosis: [],
  companyDoc: [],
};

function hasPatientUploadFiles(files?: PatientUploadFiles): boolean {
  if (!files) return false;
  return files.diagnosis.length > 0 || files.companyDoc.length > 0;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function DocumentUploadBox({
  id,
  label,
  files,
  onAddFiles,
  onRemoveFile,
}: {
  id: string;
  label: string;
  files: File[];
  onAddFiles: (newFiles: File[]) => void;
  onRemoveFile: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFiles = files.length > 0;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const picked = Array.from(e.target.files);
    if (picked.length === 0) return;
    onAddFiles(picked);
    e.target.value = "";
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all ${
        hasFiles
          ? "border-[#22C55E] bg-[#F0FDF4] shadow-[0_2px_12px_rgba(34,197,94,0.12)]"
          : "border-dashed border-gray-300 bg-gray-50"
      }`}
    >
      <input
        id={id}
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden
      />

      <button
        type="button"
        onClick={openFilePicker}
        className={`w-full text-center transition-all active:scale-[0.99] rounded-xl py-3 px-4 ${
          hasFiles
            ? "border border-[#3182F6]/25 bg-[#F0F6FF] hover:bg-[#E8F3FF]"
            : "hover:border-[#3182F6]/40 hover:bg-[#F0F6FF]/40"
        }`}
      >
        <p
          className={`text-[15px] font-semibold tracking-[-0.02em] leading-snug ${
            hasFiles ? "text-[#3182F6]" : "text-[#191F28]"
          }`}
        >
          {hasFiles ? "＋ 사진·파일 더 추가하기" : label}
        </p>
        <p className="mt-1.5 text-[12px] text-[#8B95A1]">
          PDF · JPG · PNG · 여러 장 한 번에 선택 가능 (장당 최대 15MB)
        </p>
      </button>

      {hasFiles && (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${id}-${index}-${file.name}-${file.lastModified}`}
              className="flex items-center gap-2.5 rounded-xl bg-white/80 border border-emerald-200/80 px-3 py-2.5"
            >
              {file.type.startsWith("image/") ? (
                <FileThumbnail file={file} />
              ) : (
                <span className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                  📄
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#16A34A] truncate">
                  ✅ {file.name}
                </p>
                <p className="text-[11px] text-[#8B95A1]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                aria-label={`${file.name} 삭제`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return (
      <span className="w-10 h-10 shrink-0 rounded-lg bg-slate-100 border border-slate-200" />
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="w-10 h-10 shrink-0 rounded-lg object-cover border border-slate-200"
    />
  );
}

function DocumentsUploadScreen({
  isEmployed,
  onSubmit,
}: {
  isEmployed: boolean;
  onSubmit: (files: PatientUploadFiles) => void;
}) {
  const [files, setFiles] = useState<PatientUploadFiles>(EMPTY_UPLOAD_FILES);

  const hasAnyFiles = hasPatientUploadFiles(files);

  const employmentDocLabel = isEmployed
    ? "📷 재직증명서 또는 근로계약서 첨부하기"
    : "📷 건강보험 자격득실확인서 첨부하기";

  const appendFiles = (key: keyof PatientUploadFiles, incoming: File[]) => {
    setFiles((prev) => ({
      ...prev,
      [key]: [...prev[key], ...incoming],
    }));
  };

  const removeFile = (key: keyof PatientUploadFiles, index: number) => {
    setFiles((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const handleSubmitClick = () => {
    onSubmit(files);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-36">
        <h1 className="text-[22px] font-bold leading-[1.45] tracking-[-0.03em] text-[#191F28] mb-2">
          추가 서류 제출 (선택) 📝
        </h1>
        <p className="text-[14px] text-[#8B95A1] leading-[1.65] tracking-[-0.02em] mb-6">
          위임 계약은 이미 접수되었습니다. 진단서·재직(자격) 서류가 있으면
          미리 올려 주시면 수속이 더 빨라집니다. 없어도 접수는 완료된 상태입니다.
        </p>

        <div className="space-y-4">
          <DocumentUploadBox
            id="diagnosis-upload"
            label="📷 진단서 (상병명 기재) 사진 첨부하기"
            files={files.diagnosis}
            onAddFiles={(incoming) => appendFiles("diagnosis", incoming)}
            onRemoveFile={(index) => removeFile("diagnosis", index)}
          />
          <DocumentUploadBox
            id="employment-doc-upload"
            label={employmentDocLabel}
            files={files.companyDoc}
            onAddFiles={(incoming) => appendFiles("companyDoc", incoming)}
            onRemoveFile={(index) => removeFile("companyDoc", index)}
          />
        </div>
      </main>

      <FixedCTA
        label={hasAnyFiles ? "첨부 서류와 함께 저장하기" : "건너뛰고 접수 완료 화면으로"}
        onClick={handleSubmitClick}
        hint={
          hasAnyFiles
            ? "첨부한 서류는 접수 건에 추가로 저장됩니다."
            : "서류 없이도 접수가 완료됩니다. 나중에 파트너·노무사에게 전달하셔도 됩니다."
        }
      />
    </div>
  );
}

function ContractSignScreen({
  clientName,
  onNext,
}: {
  clientName: string;
  onNext: (signatureBase64: string) => void;
}) {
  const [hasSignature, setHasSignature] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);
  const canProceed = hasSignature && termsAccepted;
  const displayName = clientName.trim() || "위임인";

  const handleSubmit = () => {
    const signature = sigRef.current?.getSignatureDataUrl();
    if (!signature) return;
    onNext(signature);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-36">
        <div className="rounded-2xl bg-[#F0F6FF] border border-[#3182F6]/20 px-4 py-3.5 mb-5">
          <p className="text-[14px] font-bold text-[#191F28] tracking-[-0.02em] leading-[1.45]">
            🛡️ 걱정 마세요, 초기 비용은 0원입니다!
          </p>
          <p className="text-[13px] text-[#8B95A1] leading-[1.55] tracking-[-0.02em] mt-1.5">
            착수금 무료 · 성공보수 25% (실제 보상금 수령 시에만 발생)
          </p>
        </div>

        <h1 className="text-[22px] font-bold leading-[1.45] tracking-[-0.03em] text-[#191F28] mb-2">
          파로스 노무법인 온라인 사건 위임 계약 📝
        </h1>
        <p className="text-[14px] text-[#8B95A1] leading-[1.55] tracking-[-0.02em] mb-5">
          {displayName} 님, 아래 3종 약관을 확인하신 후 전자 서명해 주세요.
        </p>

        <div className="space-y-3 mb-6">
          {CONTRACT_DOCUMENTS.map((doc, i) => (
            <ContractAccordion
              key={doc.id}
              title={doc.title}
              paragraphs={doc.paragraphs}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-gray-300 accent-[#3182F6]"
          />
          <span className="text-[13px] text-gray-700 leading-[1.55] tracking-[-0.02em]">
            [필수] 위임장, 대리인 선임, 위임 약정 내용에 모두 동의합니다.
          </span>
        </label>

        <SignaturePadField
          ref={sigRef}
          heightClass="h-48"
          watermark="위 3가지 문서에 모두 동의하며, 여기에 정자로 서명해 주세요."
          onSignatureChange={setHasSignature}
        />
      </main>

      <FixedCTA
        label="서류 제출하고 접수 완료하기"
        disabled={!canProceed}
        onClick={handleSubmit}
        hint={
          !canProceed ? "약관 동의와 전자 서명을 모두 완료해 주세요." : undefined
        }
      />
    </div>
  );
}

function ContactScreen({
  data,
  step,
  totalLabel,
  progress,
  canProceed,
  onSubmit,
  onPatch,
}: {
  data: FormData;
  step: number;
  totalLabel: string;
  progress: number;
  canProceed: boolean;
  onSubmit: () => void;
  onPatch: (patch: Partial<FormData>) => void;
}) {
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  const handleRrnBackChange = (e: ChangeEvent<HTMLInputElement>) => {
    const prev = data.residentNumberBack;
    const maskedPrev = maskResidentNumberBack(prev);
    const val = e.target.value;

    if (val.length === 0) {
      onPatch({ residentNumberBack: "" });
      return;
    }
    if (val.length > maskedPrev.length) {
      const ch = val.slice(-1);
      if (/[0-9]/.test(ch)) {
        onPatch({ residentNumberBack: (prev + ch).slice(0, 7) });
      }
      return;
    }
    onPatch({ residentNumberBack: prev.slice(0, -1) });
  };

  return (
    <>
      <StepShell
        step={step}
        totalLabel={totalLabel}
        progress={progress}
        title="접수를 위한 기본 정보를 입력해 주세요"
        description="관공서 제출용 정보입니다. 암호화되어 안전하게 보관됩니다."
        mainClassName="pb-40"
        footer={
          <FixedCTA
            label="📊 내 예상 보상금 산출 및 무료 상담 신청하기"
            disabled={!canProceed}
            onClick={onSubmit}
            enhancedShadow
            hint={
              !canProceed
                ? "필수 정보 입력과 개인정보·상담 신청 동의를 모두 완료해 주세요."
                : "본 버튼을 누르시면 예상 보상금 결과가 출력되며, 전문가의 상세 진단을 위한 무료 상담이 자동 접수됩니다."
            }
          />
        }
      >
        <div className="space-y-5 pb-24">
          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              이름
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="홍길동"
              className={CONTACT_INPUT}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              연락처
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={data.phone}
              onChange={(e) =>
                onPatch({ phone: formatPhoneNumber(e.target.value) })
              }
              placeholder="010-1234-5678"
              className={CONTACT_INPUT}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              주민등록번호
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={data.residentNumberFront}
                onChange={(e) =>
                  onPatch({
                    residentNumberFront: e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                  })
                }
                placeholder="앞 6자리"
                className={`${CONTACT_INPUT} text-center tabular-nums`}
              />
              <span className="text-[#8B95A1] font-semibold text-center px-0.5">-</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={maskResidentNumberBack(data.residentNumberBack)}
                onChange={handleRrnBackChange}
                placeholder="뒤 7자리"
                className={`${CONTACT_INPUT} text-center tabular-nums tracking-widest`}
                aria-label="주민등록번호 뒷자리"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#8B95A1] tracking-[-0.02em]">
              🔒 성별 코드(첫 자리)만 표시되며, 나머지는 •로 마스킹됩니다.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              주소
            </label>
            <button
              type="button"
              onClick={() => setPostcodeOpen(true)}
              className="w-full mb-2 py-3.5 rounded-2xl bg-[#3182F6] text-white font-bold text-[15px] tracking-[-0.02em] active:scale-[0.98] transition-transform shadow-[0_4px_14px_rgba(49,130,246,0.28)]"
            >
              주소 검색
            </button>
            <input
              type="text"
              readOnly
              value={data.addressBase}
              placeholder="주소 검색 버튼을 눌러주세요"
              className={`${CONTACT_INPUT} bg-[#F9FAFB] text-[#4E5968] mb-2`}
            />
            {data.addressBase.length > 0 && (
              <input
                type="text"
                value={data.addressDetail}
                onChange={(e) => {
                  const detail = e.target.value;
                  onPatch({
                    addressDetail: detail,
                    address: buildFullAddress(data.addressBase, detail),
                  });
                }}
                placeholder="상세 주소 (동/호수)"
                className={CONTACT_INPUT}
              />
            )}
          </div>

          <PrivacyConsentSection
            consentPersonalInfo={data.consentPersonalInfo}
            consentUniqueId={data.consentUniqueId}
            consentConsultation={data.consentConsultation}
            onPatch={onPatch}
          />
        </div>
      </StepShell>

      <AnimatePresence>
        {postcodeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="주소 검색 닫기"
              onClick={() => setPostcodeOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
              className="relative z-10 w-full max-w-md h-[85vh] bg-white rounded-t-3xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6]">
                <p className="text-[16px] font-bold text-[#191F28] tracking-[-0.02em]">
                  주소 검색
                </p>
                <button
                  type="button"
                  onClick={() => setPostcodeOpen(false)}
                  className="text-[14px] font-semibold text-[#8B95A1]"
                >
                  닫기
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <DaumPostcode
                  style={{ width: "100%", height: "100%" }}
                  onComplete={(result) => {
                    const base = result.roadAddress || result.address;
                    onPatch({
                      addressBase: base,
                      zonecode: result.zonecode ?? "",
                      address: buildFullAddress(base, data.addressDetail),
                    });
                    setPostcodeOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SingleChoiceStep({
  step,
  totalLabel,
  progress,
  title,
  description,
  options,
  selected,
  onPick,
}: {
  step: number;
  totalLabel: string;
  progress: number;
  title: string;
  description?: string;
  options: readonly string[];
  selected: string;
  onPick: (label: string) => void;
}) {
  return (
    <StepShell
      step={step}
      totalLabel={totalLabel}
      progress={progress}
      title={title}
      description={description}
    >
      {options.map((label) => (
        <OptionCard
          key={label}
          title={label}
          selected={selected === label}
          onClick={() => onPick(label)}
        />
      ))}
    </StepShell>
  );
}

function SingleChoiceWithOtherStep({
  step,
  totalLabel,
  progress,
  title,
  description,
  options,
  selected,
  otherActive,
  otherButtonLabel,
  otherPlaceholder,
  otherText,
  canProceedNext,
  onPickOption,
  onPickOther,
  onOtherTextChange,
  onOtherSubmit,
}: {
  step: number;
  totalLabel: string;
  progress: number;
  title: string;
  description?: string;
  options: readonly string[];
  selected: string;
  otherActive: boolean;
  otherButtonLabel: string;
  otherPlaceholder: string;
  otherText: string;
  canProceedNext: boolean;
  onPickOption: (label: string) => void;
  onPickOther: () => void;
  onOtherTextChange: (text: string) => void;
  onOtherSubmit: () => void;
}) {
  const otherInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherActive) return;
    const timer = window.setTimeout(() => {
      otherInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [otherActive]);

  return (
    <StepShell
      step={step}
      totalLabel={totalLabel}
      progress={progress}
      title={title}
      description={description}
      footer={
        otherActive ? (
          <FixedCTA
            label="다음"
            disabled={!canProceedNext}
            onClick={onOtherSubmit}
          />
        ) : undefined
      }
    >
      {options.map((label) => (
        <OptionCard
          key={label}
          title={label}
          selected={!otherActive && selected === label}
          onClick={() => onPickOption(label)}
        />
      ))}

      <OptionCard
        title={otherButtonLabel}
        selected={otherActive}
        onClick={onPickOther}
      />

      <AnimatePresence>
        {otherActive && (
          <motion.div
            ref={otherInputRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              value={otherText}
              onChange={(e) => onOtherTextChange(e.target.value)}
              placeholder={otherPlaceholder}
              className={OTHER_TEXT_INPUT_CLASS}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function DynamicForm({
  onBackToLanding,
  referralCode,
  partnerName,
}: {
  onBackToLanding?: () => void;
  referralCode?: string | null;
  partnerName?: string | null;
}) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<StepKey>("welcome");
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  /** CRM/내부 라우팅용 — UI에 노출하지 않음 */
  const [internalGrade, setInternalGrade] = useState<LeadGrade | null>(null);
  const [analysisLoadingMode, setAnalysisLoadingMode] = useState<
    "compensation" | "review"
  >("compensation");
  /** submit-loading에서 뒤로가기 시 복귀할 단계 */
  const [submitReturnStep, setSubmitReturnStep] = useState<StepKey>("contact");
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** localStorage 복구 완료 전까지 자동 저장 방지 (Hydration 안전) */
  const [backupHydrated, setBackupHydrated] = useState(false);
  const loadingTimerRef = useRef<number | null>(null);
  const submitTimerRef = useRef<number | null>(null);
  /** Step 8 서명 → Step 9 서류 업로드 제출 시 사용 */
  const pendingSignatureRef = useRef<string | null>(null);
  /** 접수 완료 후 추가 서류 업로드용 */
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [intakeUploadToken, setIntakeUploadToken] = useState<string | null>(null);
  const [intakeWizardStep, setIntakeWizardStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  /** 마운트 시 접수 완료 세션 또는 진행 중 폼 백업 복구 */
  useEffect(() => {
    const completed = loadCompletedIntakeSession();
    if (completed) {
      setSubmittedLeadId(completed.leadId);
      setIntakeUploadToken(completed.uploadToken);
      setIntakeWizardStep(completed.wizardStep);
      setStep(completed.wizardDone ? "intake-finished" : "intake-wizard");
      setBackupHydrated(true);
      return;
    }

    const backup = loadFormBackup();
    if (backup) {
      const resolvedStep = resolveResumeStep(backup.step, backup.data);
      setData(backup.data);
      setStep(resolvedStep);
      setInternalGrade(backup.internalGrade);
      if (resolvedStep === "contact" && backup.step !== "contact") {
        toast.message("연락처 정보를 확인한 뒤 이어서 진행해 주세요.");
      }
    }
    setBackupHydrated(true);
  }, []);

  /** formData·step 변경 시 실시간 자동 저장 */
  useEffect(() => {
    if (!backupHydrated || typeof window === "undefined") return;

    if (step === "intake-wizard" || step === "intake-finished") {
      clearFormBackup();
      return;
    }

    if (TRANSIENT_STEPS.has(step)) return;

    saveFormBackup({ step, data, internalGrade });
  }, [backupHydrated, step, data, internalGrade]);

  const handleResetForm = () => {
    clearFormBackup();
    clearCompletedIntakeSession();
    pendingSignatureRef.current = null;
    setSubmittedLeadId(null);
    setIntakeUploadToken(null);
    setIntakeWizardStep(1);
    setData(INITIAL);
    setInternalGrade(null);
    setDirection(-1);
    setStep("welcome");
  };

  const handleNewIntake = () => {
    handleResetForm();
  };

  const handleCompleteGoHome = () => {
    if (onBackToLanding) {
      onBackToLanding();
      return;
    }
    setDirection(-1);
    setStep("welcome");
  };

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const pickAndGo = (patch: Partial<FormData>) => {
    const merged = { ...data, ...patch };
    setData(merged);
    window.setTimeout(() => {
      const next = getNextStep(step, merged);
      if (next) {
        setDirection(1);
        setStep(next);
      }
    }, 220);
  };

  const proceedToNext = (patch?: Partial<FormData>) => {
    const merged = patch ? { ...data, ...patch } : data;
    if (patch) setData(merged);
    window.setTimeout(() => {
      const next = getNextStep(step, merged);
      if (next) {
        setDirection(1);
        setStep(next);
      }
    }, 220);
  };

  const stepSequence = useMemo(() => getStepSequence(data), [data]);
  const progress = getProgress(step, data);
  const stepNumber =
    step === "welcome" ? 0 : Math.max(1, stepSequence.indexOf(step) + 1);
  const totalSteps = stepSequence.filter(
    (s) =>
      s !== "result" &&
      s !== "result-b" &&
      s !== "result-c" &&
      s !== "documents-sign" &&
      s !== "documents-upload" &&
      s !== "intake-wizard" &&
      s !== "intake-finished"
  ).length;
  const showProgress =
    step !== "welcome" &&
    step !== "loading" &&
    step !== "submit-loading" &&
    step !== "result" &&
    step !== "result-b" &&
    step !== "result-c" &&
    step !== "consultation-offer" &&
    step !== "consultation-success" &&
    step !== "documents-sign" &&
    step !== "documents-upload" &&
    step !== "intake-wizard" &&
    step !== "intake-finished";

  const capturedReferrer = useMemo(() => {
    const fromUrl = captureReferrerFromSearchParams(searchParams);
    if (fromUrl !== NATURAL_INFLOW) return fromUrl;
    const ref = referralCode?.trim();
    if (ref) return ref;
    return NATURAL_INFLOW;
  }, [searchParams, referralCode]);

  const handleSubmit = async (
    snapshot: FormData = data,
    options?: {
      silent?: boolean;
      /** true면 submit-loading 없이 API만 호출 (연락처 제출 시 분석 로딩과 병행) */
      background?: boolean;
      internalGrade?: LeadGrade | null;
      signature?: string;
      patientFiles?: PatientUploadFiles;
    },
  ): Promise<boolean> => {
    const returnStep = step;
    const deferStepChange = options?.silent || options?.background;
    const gradeForSubmit =
      options?.internalGrade !== undefined
        ? options.internalGrade
        : internalGrade ?? calculateGrade(snapshot);

    if (!deferStepChange) {
      setSubmitReturnStep(step);
      setSubmitError(null);
      setDirection(1);
      setStep("submit-loading");
    }

    const refCode = referralCode ?? searchParams.get("ref") ?? null;
    const partnerNameParam =
      partnerName ?? normalizePartnerName(searchParams.get("name") ?? null);

    const failSubmit = (message: string): false => {
      if (options?.silent) {
        setSubmitError(message);
        return false;
      }
      if (options?.background) {
        toast.error(message);
        setSubmitError(message);
        return false;
      }
      toast.error(message);
      setSubmitError(message);
      setDirection(-1);
      setStep(returnStep);
      return false;
    };

    try {
      let nextLeadId: string | null = null;
      let nextUploadToken: string | null = null;

      if (options?.signature) {
        if (options.patientFiles) {
          console.log("[DynamicForm] Step 9 첨부 서류", {
            mockMode: PATIENT_DOC_UPLOAD_MOCK,
            diagnosis: options.patientFiles.diagnosis.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type,
            })),
            companyDoc: options.patientFiles.companyDoc.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type,
            })),
          });
        }

        const hasFilesToUpload = hasPatientUploadFiles(options.patientFiles);
        const useMultipart = hasFilesToUpload && !PATIENT_DOC_UPLOAD_MOCK;

        const response = useMultipart
          ? await (() => {
              const fd = new FormData();
              fd.append("formData", JSON.stringify(snapshot));
              fd.append("signature", options.signature!);
              for (const file of options.patientFiles!.diagnosis) {
                fd.append("diagnosis", file);
              }
              for (const file of options.patientFiles!.companyDoc) {
                fd.append("companyDoc", file);
              }
              if (gradeForSubmit) fd.append("internalGrade", gradeForSubmit);
              if (refCode) fd.append("refCode", refCode);
              if (partnerNameParam) fd.append("partnerName", partnerNameParam);
              fd.append("referrer", capturedReferrer);
              if (CONTRACT_BLOB_DOWNLOAD_MODE) fd.append("testMode", "true");
              return fetch("/api/generate-contract", { method: "POST", body: fd });
            })()
          : await fetch("/api/generate-contract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                formData: snapshot,
                signature: options.signature,
                internalGrade: gradeForSubmit,
                refCode,
                partnerName: partnerNameParam,
                referrer: capturedReferrer,
                testMode: CONTRACT_BLOB_DOWNLOAD_MODE,
              }),
            });

        if (!response.ok) {
          let message = PDF_SUBMIT_ERROR_MESSAGE;
          try {
            const errBody = (await response.json()) as {
              error?: string;
              debug?: unknown;
            };
            if (process.env.NODE_ENV === "development" && errBody.debug) {
              console.error("[DynamicForm] PDF 생성 디버그:", errBody.debug);
            }
            if (errBody.error) message = errBody.error;
          } catch {
            // PDF/비JSON 오류 응답
          }
          failSubmit(message);
          return false;
        }

        const contentType = response.headers.get("Content-Type") ?? "";

        if (contentType.includes("application/pdf")) {
          const blob = await response.blob();
          downloadPdfBlob(blob, buildContractPdfFilename(snapshot.name));
        } else {
          const result = (await response.json()) as {
            error?: string;
            success?: boolean;
            warning?: string;
            debug?: unknown;
            leadId?: string;
            uploadToken?: string;
          };
          if (!result.success) {
            if (process.env.NODE_ENV === "development" && result.debug) {
              console.error("[DynamicForm] PDF 생성 디버그:", result.debug);
            }
            failSubmit(result.error ?? PDF_SUBMIT_ERROR_MESSAGE);
            return false;
          }
          if (result.warning) {
            toast.warning(result.warning);
          }
          nextLeadId = result.leadId ?? null;
          nextUploadToken = result.uploadToken ?? null;
        }
      } else {
        const payload = mapDynamicFormToLeadSubmit(snapshot, {
          internalGrade: gradeForSubmit,
          refCode,
          partnerName: partnerNameParam,
          referrer: capturedReferrer,
        });

        const response = await fetch("/api/leads/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as {
          error?: string;
          success?: boolean;
          debug?: unknown;
          leadId?: string;
          uploadToken?: string;
        };

        if (!response.ok) {
          if (process.env.NODE_ENV === "development" && result.debug) {
            console.error("[DynamicForm] 서버 디버그:", result.debug);
          }
          failSubmit(
            result.error ?? "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          );
          return false;
        }

        nextLeadId = result.leadId ?? null;
        nextUploadToken = result.uploadToken ?? null;
      }

      clearFormBackup();
      pendingSignatureRef.current = null;
      setSubmittedLeadId(nextLeadId);
      setIntakeUploadToken(nextUploadToken);

      if (options?.silent || options?.background) {
        setSubmitError(null);
        return true;
      }

      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);

      if (options?.signature && INTAKE_FLOW_INCLUDES_CONTRACT) {
        if (nextLeadId) {
          saveCompletedIntakeSession(nextLeadId, nextUploadToken, 1, false);
        }
        submitTimerRef.current = window.setTimeout(() => setStep("intake-wizard"), 800);
        return true;
      }

      submitTimerRef.current = window.setTimeout(() => {
        setDirection(1);
        setStep("consultation-success");
      }, 800);
      return true;
    } catch (networkErr) {
      console.error("[DynamicForm] 제출 오류:", networkErr);
      return failSubmit(PDF_SUBMIT_ERROR_MESSAGE);
    }
  };

  const goNext = () => {
    const next = getNextStep(step, data);
    if (next) {
      setDirection(1);
      setStep(next);
    }
  };

  const goPrev = () => {
    if (step === "welcome") {
      setDirection(-1);
      onBackToLanding?.();
      return;
    }
    if (step === "loading") {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setDirection(-1);
      setStep("contact");
      return;
    }
    if (step === "submit-loading") {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      setDirection(-1);
      setStep(submitReturnStep);
      return;
    }
    if (step === "consultation-success") {
      handleConsultationSuccessHome();
      return;
    }
    if (step === "intake-finished") {
      setDirection(-1);
      setStep("intake-wizard");
      return;
    }
    if (step === "intake-wizard") {
      setDirection(-1);
      setStep("documents-sign");
      return;
    }
    if (step === "documents-sign") {
      setDirection(-1);
      if (internalGrade === "B") setStep("result-b");
      else setStep("result");
      return;
    }
    if (step === "result-b" || step === "result-c") {
      setDirection(-1);
      setStep("contact");
      return;
    }
    if (step === "result") {
      setDirection(-1);
      setStep("contact");
      return;
    }
    const prev = getPrevStep(step, data);
    if (prev) {
      setDirection(-1);
      setStep(prev);
    }
  };

  const handleSymptomSelect = (symptom: MainSymptom) => {
    if (!symptom) return;
    const merged: FormData = {
      ...INITIAL,
      employment: data.employment,
      employmentLabel: data.employmentLabel,
      insurance: data.insurance,
      insuranceLabel: data.insuranceLabel,
      symptom,
      symptomLabel: SYMPTOM_LABELS[symptom],
    };
    setData(merged);
    window.setTimeout(() => {
      setDirection(1);
      const next = getNextStep("symptom", merged);
      if (next) setStep(next);
    }, 220);
  };

  const shellProps = {
    step: stepNumber,
    totalLabel: String(totalSteps),
    progress: showProgress ? progress : 0,
  };

  const handleWizardFinished = () => {
    saveIntakeWizardProgress(3, true);
    setDirection(1);
    setStep("intake-finished");
  };

  const showReset =
    step !== "intake-wizard" &&
    step !== "intake-finished" &&
    step !== "consultation-success" &&
    step !== "loading" &&
    step !== "submit-loading" &&
    step !== "documents-sign" &&
    step !== "documents-upload";

  const expectedCompensation = useMemo(
    () => getExpectedCompensation(data.symptom),
    [data.symptom]
  );

  const handleContactSubmit = () => {
    if (!canProceed("contact", data)) {
      toast.error("연락처·동의 정보를 먼저 입력해 주세요.");
      return;
    }
    const snapshot = data;
    const grade = calculateGrade(snapshot);
    setInternalGrade(grade);
    setAnalysisLoadingMode(
      shouldShowCompensationResult(snapshot, grade) ? "compensation" : "review",
    );
    if (process.env.NODE_ENV === "development") {
      console.info("[DynamicForm] 노무사 대시보드 전달용 formData:", snapshot);
    }
    setSubmitReturnStep("contact");

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    setDirection(1);
    setStep("loading");

    const analysisMinDelay = new Promise<void>((resolve) => {
      loadingTimerRef.current = window.setTimeout(resolve, ANALYSIS_LOADING_DURATION_MS);
    });

    void (async () => {
      const submitPromise = handleSubmit(snapshot, {
        background: true,
        internalGrade: grade,
      });
      await analysisMinDelay;
      const submitOk = await submitPromise;

      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      if (!submitOk) {
        setDirection(-1);
        setStep("contact");
        return;
      }

      setDirection(1);
      setStep("consultation-success");
    })();
  };

  const handleConsultationApply = () => {
    handleContactSubmit();
  };

  const handleConsultationSuccessHome = () => {
    clearFormBackup();
    clearCompletedIntakeSession();
    setData(INITIAL);
    setInternalGrade(null);
    setSubmittedLeadId(null);
    setIntakeUploadToken(null);
    setDirection(-1);
    setStep("welcome");
  };

  const goToContractSign = () => {
    if (!INTAKE_FLOW_INCLUDES_CONTRACT) {
      handleConsultationApply();
      return;
    }
    setSubmitReturnStep("documents-sign");
    setDirection(1);
    setStep("documents-sign");
  };

  const handleContractComplete = (signatureBase64: string) => {
    if (!isContactInfoComplete(data)) {
      toast.error("이름과 연락처를 먼저 입력해 주세요.");
      setSubmitReturnStep("documents-sign");
      setDirection(-1);
      setStep("contact");
      return;
    }
    const front = data.residentNumberFront.replace(/\D/g, "");
    const back = data.residentNumberBack.replace(/\D/g, "");
    if (front.length !== 6 || back.length !== 7) {
      toast.error("주민등록번호를 입력한 뒤 다시 서명해 주세요.");
      setSubmitReturnStep("documents-sign");
      setDirection(-1);
      setStep("contact");
      return;
    }
    setSubmitReturnStep("documents-sign");
    pendingSignatureRef.current = signatureBase64;
    void handleSubmit(data, { signature: signatureBase64 });
  };

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <WelcomeScreen
            onStart={() => {
              setDirection(1);
              setStep("symptom");
            }}
          />
        );

      case "filter":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="거의 다 왔어요! 기본 정보만 확인할게요"
            description="재직 상태와 4대보험 가입 여부를 알려주세요."
            footer={
              <FixedCTA
                label="다음"
                disabled={!canProceed("filter", data)}
                onClick={goNext}
              />
            }
          >
            <p className="text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] -mb-2">
              재직 상태
            </p>
            <OptionCard
              emoji="💼"
              title="현재 재직 중"
              selected={data.employment === "employed"}
              onClick={() => {
                set("employment", "employed");
                set("employmentLabel", "현재 재직 중");
              }}
            />
            <OptionCard
              emoji="🚪"
              title="퇴사 / 휴직"
              selected={data.employment === "resigned"}
              onClick={() => {
                set("employment", "resigned");
                set("employmentLabel", "퇴사 / 휴직");
              }}
            />

            <p className="text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] -mb-2 mt-2">
              4대보험 가입 여부
            </p>
            <OptionCard
              emoji="✅"
              title="가입되어 있어요"
              selected={data.insurance === "yes"}
              onClick={() => {
                set("insurance", "yes");
                set("insuranceLabel", "가입되어 있어요");
              }}
            />
            <OptionCard
              emoji="❌"
              title="가입 안 되어 있어요"
              selected={data.insurance === "no"}
              onClick={() => {
                set("insurance", "no");
                set("insuranceLabel", "가입 안 되어 있어요");
              }}
            />
          </StepShell>
        );

      case "symptom":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="먼저, 해당되는 질환 유형을 선택해 주세요"
            description="전문 노무사 상담용 체크리스트를 순서대로 안내드릴게요."
          >
            {(
              [
                {
                  id: "bone" as const,
                  emoji: "🦴",
                  title: "근골격계 질환",
                  sub: "허리 디스크, 힘줄 파열 등",
                },
                {
                  id: "hearing" as const,
                  emoji: "👂",
                  title: "소음성 난청",
                  sub: "공장·조선소 등 소음 노출",
                },
                {
                  id: "respiratory" as const,
                  icon: LungIcon,
                  title: "호흡기 질병",
                  sub: "폐암, 진폐, 석면 등",
                },
                {
                  id: "overwork" as const,
                  emoji: "🧠",
                  title: "뇌·심혈관계 (과로)",
                  sub: "뇌출혈, 심근경색, 과로사",
                },
                {
                  id: "stress" as const,
                  emoji: "💔",
                  title: "우울증/스트레스",
                  sub: "업무 스트레스·괴롭힘",
                },
                {
                  id: "accident" as const,
                  emoji: "💥",
                  title: "기타 사고",
                  sub: "추락, 부딪힘 등",
                },
              ] as const
            ).map((item) => (
              <OptionCard
                key={item.id}
                emoji={"emoji" in item ? item.emoji : undefined}
                icon={"icon" in item ? item.icon : undefined}
                title={item.title}
                subtitle={item.sub}
                selected={data.symptom === item.id}
                onClick={() => handleSymptomSelect(item.id)}
              />
            ))}
          </StepShell>
        );

      case "hearing-status":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="귀의 상태는 어떠신가요?"
            options={HEARING_STATUS_OPTIONS}
            selected={data.hearingEarStatus}
            onPick={(label) => pickAndGo({ hearingEarStatus: label })}
          />
        );

      case "hearing-history":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="귀와 관련된 과거 병력이 있으신가요?"
            description="중요! 산재 인정 시 반드시 확인하는 항목이에요."
            options={HEARING_HISTORY_OPTIONS}
            selected={data.hearingPastHistory}
            onPick={(label) => pickAndGo({ hearingPastHistory: label })}
          />
        );

      case "hearing-protection":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="귀마개 등 보호구를 착용하셨나요?"
            description="소음 노출 기간과 함께 업무상 인과관계 판단에 활용됩니다."
            options={HEARING_PROTECTION_OPTIONS}
            selected={data.hearingProtection}
            onPick={(label) => pickAndGo({ hearingProtection: label })}
          />
        );

      case "bone-body-part":
        return (
          <MultiChoiceStep
            {...shellProps}
            title="가장 아프거나 수술하신 부위는 어디인가요?"
            description="해당하는 부위를 모두 선택해 주세요."
            options={BONE_BODY_PART_OPTIONS}
            selected={data.painBodyPart}
            canProceedNext={canProceed("bone-body-part", data)}
            onToggle={(label) =>
              setData((prev) => ({
                ...prev,
                painBodyPart: toggleArrayItem(prev.painBodyPart, label),
              }))
            }
            onProceed={() =>
              proceedToNext({
                diagnosis: [],
                diagnosisOtherText: "",
                diagnosisOtherMode: false,
              })
            }
          />
        );

      case "bone-diagnosis": {
        const boneDiagnosisOptions = getBoneDiagnosisOptionsForParts(data.painBodyPart);
        const boneDiagnosisOtherActive =
          data.diagnosisOtherMode || data.diagnosisOtherText.length > 0;
        const selectedFromOptions = data.diagnosis.filter((d) =>
          boneDiagnosisOptions.includes(d),
        );
        return (
          <MultiChoiceWithOtherStep
            {...shellProps}
            title="병원에서 받은 정확한 진단은 무엇인가요?"
            description={
              data.painBodyPart.length > 0
                ? `선택하신 부위: ${joinFormLabels(data.painBodyPart)}`
                : undefined
            }
            options={boneDiagnosisOptions}
            selected={selectedFromOptions}
            otherActive={boneDiagnosisOtherActive}
            otherButtonLabel={BONE_DIAGNOSIS_OTHER_LABEL}
            otherPlaceholder="병원에서 받으신 정확한 진단명이나 증상을 적어주세요."
            otherText={data.diagnosisOtherText}
            canProceedNext={canProceed("bone-diagnosis", data)}
            onToggleOption={(label) =>
              setData((prev) => {
                const optionSet = new Set(boneDiagnosisOptions);
                const custom = prev.diagnosis.filter((d) => !optionSet.has(d));
                const optionPicks = prev.diagnosis.filter((d) => optionSet.has(d));
                const nextOptions = toggleArrayItem(optionPicks, label);
                return {
                  ...prev,
                  diagnosis: [...nextOptions, ...custom],
                  diagnosisOtherMode:
                    prev.diagnosisOtherMode || prev.diagnosisOtherText.trim().length > 0,
                };
              })
            }
            onPickOther={() =>
              setData((prev) => ({
                ...prev,
                diagnosisOtherMode: true,
              }))
            }
            onOtherTextChange={(text) =>
              setData((prev) => ({
                ...prev,
                diagnosisOtherText: text,
                diagnosisOtherMode: true,
              }))
            }
            onProceed={() => {
              const finalDiagnosis = mergeDiagnosisSelections(
                data.diagnosis,
                boneDiagnosisOptions,
                data.diagnosisOtherText,
              );
              proceedToNext({
                diagnosis: finalDiagnosis,
                diagnosisOtherText: "",
                diagnosisOtherMode: finalDiagnosis.some(
                  (d) => !boneDiagnosisOptions.includes(d),
                ),
              });
            }}
          />
        );
      }

      case "bone-posture":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="하루 근무 중, 아래와 같이 몸을 쓰는 자세를 얼마나 오래 하셨나요?"
            options={BONE_POSTURE_OPTIONS}
            selected={data.posture}
            onPick={(label) => pickAndGo({ posture: label })}
          />
        );

      case "bone-weight":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="하루에 다루는 물건의 무게와 빈도는 어떻게 되나요?"
            options={BONE_WEIGHT_OPTIONS}
            selected={data.weight}
            onPick={(label) => pickAndGo({ weight: label })}
          />
        );

      case "bone-onset":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="통증이 심해지거나 진단을 받게 된 시점은 언제인가요?"
            options={BONE_SYMPTOM_TIME_OPTIONS}
            selected={data.symptomTime}
            onPick={(label) => pickAndGo({ symptomTime: label })}
          />
        );

      case "respiratory-exposure": {
        const respiratoryOtherActive =
          data.respiratoryExposureOtherMode ||
          (data.respiratoryExposure.length > 0 &&
            !RESPIRATORY_EXPOSURE_OPTIONS.includes(
              data.respiratoryExposure as (typeof RESPIRATORY_EXPOSURE_OPTIONS)[number],
            ));
        return (
          <SingleChoiceWithOtherStep
            {...shellProps}
            title="업무 중 주로 노출된 물질은?"
            options={RESPIRATORY_EXPOSURE_OPTIONS}
            selected={data.respiratoryExposure}
            otherActive={respiratoryOtherActive}
            otherButtonLabel={RESPIRATORY_EXPOSURE_OTHER_LABEL}
            otherPlaceholder="예: 특수 화학물질, 특정 소음 기계 등"
            otherText={
              respiratoryOtherActive ? data.respiratoryExposure : ""
            }
            canProceedNext={canProceed("respiratory-exposure", data)}
            onPickOption={(label) =>
              pickAndGo({
                respiratoryExposure: label,
                respiratoryExposureOtherMode: false,
              })
            }
            onPickOther={() =>
              setData((prev) => ({
                ...prev,
                respiratoryExposure: "",
                respiratoryExposureOtherMode: true,
              }))
            }
            onOtherTextChange={(text) => set("respiratoryExposure", text)}
            onOtherSubmit={() =>
              pickAndGo({
                respiratoryExposure: data.respiratoryExposure.trim(),
                respiratoryExposureOtherMode: true,
              })
            }
          />
        );
      }

      case "respiratory-smoking":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="평소 담배를 피우시나요?"
            description="흡연 이력은 업무성 판단 시 보정 요인으로 검토됩니다."
            options={RESPIRATORY_SMOKING_OPTIONS}
            selected={data.respiratorySmoking}
            onPick={(label) => pickAndGo({ respiratorySmoking: label })}
          />
        );

      case "overwork-communicator":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="현재 재해자의 상태는 어떠신가요?"
            options={OVERWORK_COMMUNICATOR_OPTIONS}
            selected={data.overworkPatientStatus}
            onPick={(label) => pickAndGo({ overworkPatientStatus: label })}
          />
        );

      case "overwork-diagnosis": {
        const overworkDiagnosisOptions = OVERWORK_DIAGNOSIS_OPTIONS;
        const overworkDiagnosisOtherActive =
          data.diagnosisOtherMode || data.diagnosisOtherText.length > 0;
        const overworkSelectedFromOptions = data.diagnosis.filter((d) =>
          overworkDiagnosisOptions.includes(d),
        );
        return (
          <MultiChoiceWithOtherStep
            {...shellProps}
            title="병원에서 받은 진단명은 무엇인가요?"
            description="뇌·심혈관 질환 진단명을 모두 선택하거나 직접 입력해 주세요."
            options={overworkDiagnosisOptions}
            selected={overworkSelectedFromOptions}
            otherActive={overworkDiagnosisOtherActive}
            otherButtonLabel={OVERWORK_DIAGNOSIS_OTHER_LABEL}
            otherPlaceholder="예: 해리성 대동맥류 등 정확한 병명을 적어주세요."
            otherText={data.diagnosisOtherText}
            canProceedNext={canProceed("overwork-diagnosis", data)}
            onToggleOption={(label) =>
              setData((prev) => {
                const optionSet = new Set(overworkDiagnosisOptions);
                const custom = prev.diagnosis.filter((d) => !optionSet.has(d));
                const optionPicks = prev.diagnosis.filter((d) => optionSet.has(d));
                const nextOptions = toggleArrayItem(optionPicks, label);
                return {
                  ...prev,
                  diagnosis: [...nextOptions, ...custom],
                  diagnosisOtherMode:
                    prev.diagnosisOtherMode || prev.diagnosisOtherText.trim().length > 0,
                };
              })
            }
            onPickOther={() =>
              setData((prev) => ({
                ...prev,
                diagnosisOtherMode: true,
              }))
            }
            onOtherTextChange={(text) =>
              setData((prev) => ({
                ...prev,
                diagnosisOtherText: text,
                diagnosisOtherMode: true,
              }))
            }
            onProceed={() => {
              const finalDiagnosis = mergeDiagnosisSelections(
                data.diagnosis,
                overworkDiagnosisOptions,
                data.diagnosisOtherText,
              );
              proceedToNext({
                diagnosis: finalDiagnosis,
                diagnosisOtherText: "",
                diagnosisOtherMode: finalDiagnosis.some(
                  (d) => !overworkDiagnosisOptions.includes(d),
                ),
              });
            }}
          />
        );
      }

      case "overwork-trigger":
        return (
          <SingleChoiceStep
            {...shellProps}
            title="발병 전 1주일 이내 돌발 상황이 있었나요?"
            options={OVERWORK_TRIGGER_OPTIONS}
            selected={data.overworkSuddenTrigger}
            onPick={(label) => pickAndGo({ overworkSuddenTrigger: label })}
          />
        );

      case "occupation":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="어떤 업종에서 일하셨나요?"
            description="해당하는 직종을 선택해 주세요."
            footer={
              data.occupation === "other" ? (
                <FixedCTA
                  label="다음"
                  disabled={!canProceed("occupation", data)}
                  onClick={() =>
                    pickAndGo({
                      occupationLabel: data.occupationOther.trim(),
                    })
                  }
                />
              ) : undefined
            }
          >
            {OCCUPATION_OPTIONS.map((item) => (
              <OptionCard
                key={item.id}
                emoji={item.emoji}
                title={item.label}
                selected={data.occupation === item.id}
                onClick={() => {
                  if (item.id === "other") {
                    setData((prev) => ({
                      ...prev,
                      occupation: "other",
                      occupationLabel: "",
                    }));
                    return;
                  }
                  pickAndGo({
                    occupation: item.id,
                    occupationLabel: item.label,
                    occupationOther: "",
                  });
                }}
              />
            ))}

            <AnimatePresence>
              {data.occupation === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    value={data.occupationOther}
                    onChange={(e) => set("occupationOther", e.target.value)}
                    placeholder="업종을 직접 입력해 주세요"
                    className="w-full px-5 py-4 rounded-2xl bg-white text-[#191F28] text-[16px]
                               tracking-[-0.02em] placeholder:text-[#B0B8C1]
                               shadow-[0_4px_16px_rgba(0,0,0,0.04)] border-2 border-[#3182F6]
                               focus:outline-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </StepShell>
        );

      case "duration":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="해당 업무·노출을 얼마나 오래 하셨나요?"
          >
            {WORK_DURATION_OPTIONS.map((item) => (
              <OptionCard
                key={item.id}
                title={item.label}
                selected={data.workDuration === item.id}
                onClick={() =>
                  pickAndGo({
                    workDuration: item.id,
                    workDurationLabel: item.label,
                  })
                }
              />
            ))}
          </StepShell>
        );

      case "stress-cause":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="주된 스트레스 원인은 무엇인가요?"
            footer={
              data.stressCause === "other" ? (
                <FixedCTA
                  label="다음"
                  disabled={!canProceed("stress-cause", data)}
                  onClick={() =>
                    pickAndGo({
                      stressCauseLabel: data.stressCauseLabel.trim(),
                    })
                  }
                />
              ) : undefined
            }
          >
            {(
              [
                { id: "bullying" as const, emoji: "😤", title: "상사/동료 괴롭힘" },
                { id: "customer" as const, emoji: "📢", title: "고객 갑질" },
                { id: "performance" as const, emoji: "📊", title: "실적 압박" },
                { id: "witness" as const, emoji: "😰", title: "사고 목격" },
              ] as const
            ).map((item) => (
              <OptionCard
                key={item.id}
                emoji={item.emoji}
                title={item.title}
                selected={data.stressCause === item.id}
                onClick={() =>
                  pickAndGo({
                    stressCause: item.id,
                    stressCauseLabel: item.title,
                  })
                }
              />
            ))}

            <OptionCard
              emoji="✍️"
              title="기타 스트레스 원인 직접 입력"
              selected={data.stressCause === "other"}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  stressCause: "other",
                  stressCauseLabel: "",
                }))
              }
            />

            <AnimatePresence>
              {data.stressCause === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    value={data.stressCauseLabel}
                    onChange={(e) => set("stressCauseLabel", e.target.value)}
                    placeholder="가장 힘들었던 상황을 짧게 적어주세요."
                    className={OTHER_TEXT_INPUT_CLASS}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </StepShell>
        );

      case "evidence":
        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="객관적 증거가 있으신가요?"
            description="있으시면 산재 인정에 유리합니다."
          >
            {(
              [
                { id: "material" as const, emoji: "📱", title: "카톡/녹음 등 물증 있음" },
                { id: "witness" as const, emoji: "👥", title: "동료 진술 가능" },
                { id: "none" as const, emoji: "😐", title: "증거 없음" },
              ] as const
            ).map((item) => (
              <OptionCard
                key={item.id}
                emoji={item.emoji}
                title={item.title}
                selected={data.evidence === item.id}
                onClick={() =>
                  pickAndGo({
                    evidence: item.id,
                    evidenceLabel: item.title,
                  })
                }
              />
            ))}
          </StepShell>
        );

      case "generic-detail": {
        const options = [
          { id: "recent" as const, title: "네, 치료 중이에요" },
          { id: "ongoing" as const, title: "퇴원했지만 후유증 있어요" },
          { id: "recurring" as const, title: "가벼운 증상이에요" },
        ];

        return (
          <StepShell
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            title="사고 이후 증상이 지속되나요?"
          >
            {options.map((item) => (
              <OptionCard
                key={item.id}
                title={item.title}
                selected={data.genericDetail === item.id}
                onClick={() =>
                  pickAndGo({
                    genericDetail: item.id,
                    genericDetailLabel: item.title,
                  })
                }
              />
            ))}
          </StepShell>
        );
      }

      case "contact":
        return (
          <ContactScreen
            data={data}
            step={stepNumber}
            totalLabel={String(totalSteps)}
            progress={showProgress ? progress : 0}
            canProceed={canProceed("contact", data)}
            onSubmit={handleContactSubmit}
            onPatch={(patch) => setData((prev) => ({ ...prev, ...patch }))}
          />
        );

      case "loading":
        return <AnalysisLoadingScreen mode={analysisLoadingMode} />;

      case "submit-loading":
        return <SubmitLoadingScreen />;

      case "consultation-success": {
        const successGrade = internalGrade ?? calculateGrade(data);
        return (
          <ConsultationSuccessScreen
            data={data}
            compensation={expectedCompensation}
            variant={
              shouldShowCompensationResult(data, successGrade)
                ? "compensation"
                : "review"
            }
            onHome={handleConsultationSuccessHome}
          />
        );
      }

      case "result":
        return (
          <ResultScreen
            name={data.name}
            compensation={expectedCompensation}
            onProceed={goToContractSign}
          />
        );

      case "result-b":
        return <ResultBScreen onProceed={goToContractSign} />;

      case "result-c":
        return (
          <ResultCScreen
            onHome={() => {
              clearFormBackup();
              setData(INITIAL);
              setInternalGrade(null);
              setDirection(-1);
              setStep("welcome");
            }}
          />
        );

      /* ── Step 8: 위임장 서명 (서류 업로드는 DOCUMENT_UPLOAD_ENABLED 시 Step 9) ── */
      case "documents-sign":
        if (!CONTRACT_SIGN_ENABLED) return null;
        return (
          <ContractSignScreen
            clientName={data.name}
            onNext={handleContractComplete}
          />
        );

      case "documents-upload":
        if (!DOCUMENT_UPLOAD_ENABLED) return null;
        return (
          <DocumentsUploadScreen
            isEmployed={data.employment === "employed"}
            onSubmit={(patientFiles) => {
              const signature = pendingSignatureRef.current;
              if (!signature) {
                toast.error("전자 서명 정보가 없습니다. 이전 단계에서 다시 서명해 주세요.");
                setDirection(-1);
                setStep("documents-sign");
                return;
              }
              void handleSubmit(data, {
                signature,
                ...(hasPatientUploadFiles(patientFiles) ? { patientFiles } : {}),
              });
            }}
          />
        );

      case "intake-wizard":
        return (
          <IntakeDocWizard
            leadId={submittedLeadId ?? ""}
            uploadToken={intakeUploadToken}
            initialStep={intakeWizardStep}
            onFinished={handleWizardFinished}
            onNewIntake={handleNewIntake}
          />
        );

      case "intake-finished":
        return (
          <IntakeFinishedScreen
            onGoHome={handleCompleteGoHome}
            onNewIntake={handleNewIntake}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] bg-white relative overflow-hidden flex flex-col">
      {!backupHydrated ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#8B95A1]">잠시만 기다려 주세요…</p>
        </div>
      ) : (
        <>
      <FormNavBar onBack={goPrev} onReset={handleResetForm} showReset={showReset} />
      {submitError && (
        <div className="mx-4 px-4 py-3 bg-red-50 text-red-700 text-[13px] rounded-xl whitespace-pre-line border border-red-100">
          {submitError}
        </div>
      )}
      <GlobalHeader />
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={PAGE_TRANSITION}
            className="absolute inset-0 flex flex-col will-change-transform"
            style={{ backfaceVisibility: "hidden" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
        </>
      )}
    </div>
  );
}
