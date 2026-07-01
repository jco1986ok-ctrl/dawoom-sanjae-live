export const PHAROS_CUSTOMER_ID_KEY = "pharos_customer_id";
export const PHAROS_INTAKE_UPLOAD_TOKEN_KEY = "pharos_intake_upload_token";
export const PHAROS_WIZARD_STEP_KEY = "pharos_wizard_step";
export const PHAROS_WIZARD_DONE_KEY = "pharos_wizard_done";
/** 설문 중간 저장 (DynamicForm) */
export const PHAROS_FORM_BACKUP_KEY = "pharos_form_backup";

export type CompletedIntakeSession = {
  leadId: string;
  uploadToken: string | null;
  wizardStep: 1 | 2 | 3;
  wizardDone: boolean;
};

function parseWizardStep(raw: string | null): 1 | 2 | 3 {
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  return 1;
}

export function saveCompletedIntakeSession(
  leadId: string,
  uploadToken?: string | null,
  wizardStep: 1 | 2 | 3 = 1,
  wizardDone = false,
): void {
  if (typeof window === "undefined" || !leadId.trim()) return;
  window.localStorage.setItem(PHAROS_CUSTOMER_ID_KEY, leadId.trim());
  if (uploadToken?.trim()) {
    window.localStorage.setItem(PHAROS_INTAKE_UPLOAD_TOKEN_KEY, uploadToken.trim());
  } else {
    window.localStorage.removeItem(PHAROS_INTAKE_UPLOAD_TOKEN_KEY);
  }
  window.localStorage.setItem(PHAROS_WIZARD_STEP_KEY, String(wizardStep));
  window.localStorage.setItem(PHAROS_WIZARD_DONE_KEY, wizardDone ? "1" : "0");
}

export function saveIntakeWizardProgress(wizardStep: 1 | 2 | 3, wizardDone = false): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PHAROS_WIZARD_STEP_KEY, String(wizardStep));
  window.localStorage.setItem(PHAROS_WIZARD_DONE_KEY, wizardDone ? "1" : "0");
}

export function loadCompletedIntakeSession(): CompletedIntakeSession | null {
  if (typeof window === "undefined") return null;
  const leadId = window.localStorage.getItem(PHAROS_CUSTOMER_ID_KEY)?.trim();
  if (!leadId) return null;
  const uploadToken =
    window.localStorage.getItem(PHAROS_INTAKE_UPLOAD_TOKEN_KEY)?.trim() ?? null;
  const wizardStep = parseWizardStep(window.localStorage.getItem(PHAROS_WIZARD_STEP_KEY));
  const wizardDone = window.localStorage.getItem(PHAROS_WIZARD_DONE_KEY) === "1";
  return { leadId, uploadToken, wizardStep, wizardDone };
}

export function hasCompletedIntakeSession(): boolean {
  return loadCompletedIntakeSession() !== null;
}

/** 접수 완료 후 서류 마법사 또는 설문 중간 저장이 있으면 랜딩에서 이어하기 표시 */
export function hasSavedFormProgress(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(PHAROS_FORM_BACKUP_KEY));
}

export function canResumeFromLanding(): boolean {
  return hasCompletedIntakeSession() || hasSavedFormProgress();
}

export function clearCompletedIntakeSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PHAROS_CUSTOMER_ID_KEY);
  window.localStorage.removeItem(PHAROS_INTAKE_UPLOAD_TOKEN_KEY);
  window.localStorage.removeItem(PHAROS_WIZARD_STEP_KEY);
  window.localStorage.removeItem(PHAROS_WIZARD_DONE_KEY);
}
