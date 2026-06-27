import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePartnerName,
  resolveMasterAgentId,
  resolveReferrerAgent,
} from "@/lib/referral-resolve";
import { resolveReferrerForInsert } from "@/lib/capture-referrer";
import type { LeadSubmitPayload } from "@/lib/map-dynamic-form-to-lead";
import { resolveDiseaseCategoryForInsert } from "@/lib/disease-category";
import { LEAD_INTAKE_DEFAULT_STATUS } from "@/lib/intake-safe-defaults";

const CATEGORY_LABEL: Record<string, string> = {
  ear: "귀 질환 (이명·난청)",
  joint: "관절/허리 질환 (디스크 등)",
  lung: "폐·호흡기 질환 (진폐·숨참 등)",
  heart: "뇌·심장 질환 (과로·뇌출혈 등)",
};

const CURRENT_STATUS_LABEL: Record<string, string> = {
  working: "재직 중",
  "considering-leave": "휴직 고려 중",
  "considering-quit": "퇴직 고려 중",
  "already-left": "이미 퇴직",
};

const WORK_RELATION_LABEL: Record<string, string> = {
  "work-related": "업무 관련 있다고 생각",
  "not-sure": "모르겠음",
  "not-related": "업무와 관련 없을 것 같음",
};

const SANJAE_INTENT_LABEL: Record<string, string> = {
  yes: "신청 의향 있음",
  considering: "고려 중",
  "not-sure": "모르겠음",
  no: "신청 의향 없음",
};

export interface InsertLeadResult {
  success: true;
  leadId: string;
}

export interface InsertLeadError {
  success: false;
  error: string;
  debug?: {
    code?: string;
    hint?: string;
    details?: string;
    attempts?: string[];
  };
}

function formatInsertError(error: { message?: string; code?: string; details?: string; hint?: string } | null): string {
  return [error?.message, error?.details, error?.hint].filter(Boolean).join(" — ") || "알 수 없는 오류";
}

function buildLeadInsertCandidates(
  insertPayload: Record<string, unknown>,
  extras: { diseaseCategory?: string; pdfUrl?: string | null } = {},
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const candidates: Record<string, unknown>[] = [];

  const push = (payload: Record<string, unknown>) => {
    const key = JSON.stringify(payload);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(payload);
  };

  const core = {
    customer_name: insertPayload.customer_name,
    phone: insertPayload.phone,
    disease_name: insertPayload.disease_name,
    consultation_status: insertPayload.consultation_status,
    notes: insertPayload.notes ?? null,
  };

  const withReferral = {
    ...core,
    referral_source: insertPayload.referral_source ?? null,
    referred_by_user_id: insertPayload.referred_by_user_id ?? null,
    master_agent_id: insertPayload.master_agent_id ?? null,
  };

  const withCategory = extras.diseaseCategory
    ? { ...withReferral, disease_category: extras.diseaseCategory }
    : null;

  const withPdf =
    extras.pdfUrl != null && extras.pdfUrl !== ""
      ? { ...(withCategory ?? withReferral), pdf_url: extras.pdfUrl }
      : null;

  // DB에 없을 수 있는 컬럼(referrer, disease_category, pdf_url)은 제외한 payload부터 시도
  push(core);
  push(withReferral);
  if (withCategory) push(withCategory);
  if (withPdf) push(withPdf);
  push(insertPayload);

  const {
    referred_by_user_id: _r,
    master_agent_id: _m,
    ...withoutAgentIds
  } = insertPayload;
  push(withoutAgentIds);

  return candidates;
}

async function insertLeadWithFallback(
  supabase: SupabaseClient,
  insertPayload: Record<string, unknown>,
  extras: { diseaseCategory?: string; pdfUrl?: string | null } = {},
): Promise<
  | { success: true; leadId: string }
  | { success: false; error: string; debug: InsertLeadError["debug"] }
> {
  const candidates = buildLeadInsertCandidates(insertPayload, extras);
  const attempts: string[] = [];
  let lastError: { message?: string; code?: string; details?: string; hint?: string } | null = null;

  for (const payload of candidates) {
    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data?.id) {
      return { success: true, leadId: data.id as string };
    }

    lastError = error;
    attempts.push(formatInsertError(error));
  }

  return {
    success: false,
    error: `데이터 저장 실패: ${formatInsertError(lastError)}`,
    debug: {
      code: lastError?.code,
      hint: lastError?.hint,
      details: lastError?.details,
      attempts,
    },
  };
}

export async function insertLeadFromPayload(
  supabase: SupabaseClient,
  body: LeadSubmitPayload & { pdfUrl?: string | null },
): Promise<InsertLeadResult | InsertLeadError> {
  const {
    name,
    phone,
    age,
    job,
    category,
    diagnosisName,
    workYears,
    hasDiagnosis,
    hospitalName,
    currentStatus,
    companyAwareness,
    sanjaeDiscussion,
    companyReaction,
    workRelation,
    sanjaeIntent,
    additionalComment,
    refCode,
    partnerName,
    referrer,
    pdfUrl,
  } = body;

  if (!name || String(name).trim() === "") {
    return { success: false, error: "이름은 필수입니다." };
  }
  if (!phone || String(phone).trim() === "") {
    return { success: false, error: "연락처는 필수입니다." };
  }

  const categoryStr = String(category ?? "");
  const diagnosisStr = String(diagnosisName ?? "").trim();
  const categoryLabel = CATEGORY_LABEL[categoryStr] ?? "기타 질환";
  const diseaseName = diagnosisStr
    ? `${categoryLabel} (진단명: ${diagnosisStr})`
    : categoryLabel;

  const refCodeStr = refCode ? String(refCode).trim() : null;
  const partnerNameStr = normalizePartnerName(
    partnerName ? String(partnerName) : null,
  );
  let referredByUserId: string | null = null;
  let masterAgentId: string | null = null;
  let resolvedReferralSource: string | null = refCodeStr;

  const agent = await resolveReferrerAgent(supabase, refCodeStr, partnerNameStr);

  if (agent) {
    referredByUserId = agent.id;
    masterAgentId = resolveMasterAgentId(agent);
    resolvedReferralSource = agent.agent_id;
  } else if (partnerNameStr && !refCodeStr) {
    resolvedReferralSource = `name:${partnerNameStr}`;
  }

  const noteLines: string[] = [];
  const referrerValue = resolveReferrerForInsert(
    referrer ? String(referrer) : refCodeStr || null,
  );
  noteLines.push(`[추천인] ${referrerValue}`);
  if (refCodeStr) {
    noteLines.push(`[유입 링크] ?ref=${refCodeStr}`);
  } else if (partnerNameStr) {
    noteLines.push(`[유입 링크] ?name=${partnerNameStr} (구형)`);
  } else {
    noteLines.push(`[유입 링크] 자연유입`);
  }
  if (age) noteLines.push(`[나이] ${age}세`);
  if (job) noteLines.push(`[직업] ${job}`);
  if (workYears) noteLines.push(`[근무기간] ${workYears}`);
  if (hasDiagnosis !== null && hasDiagnosis !== undefined) {
    noteLines.push(`[진단 여부] ${hasDiagnosis ? "진단 받음" : "미진단"}`);
  }
  if (hospitalName) noteLines.push(`[병원] ${hospitalName}`);
  if (currentStatus) {
    noteLines.push(
      `[현재 상태] ${CURRENT_STATUS_LABEL[String(currentStatus)] ?? currentStatus}`,
    );
  }
  if (companyAwareness) {
    noteLines.push(
      `[회사 인지] ${companyAwareness === "informed" ? "회사가 알고 있음" : "회사가 모름"}`,
    );
  }
  if (sanjaeDiscussion) {
    noteLines.push(
      `[산재 논의] ${sanjaeDiscussion === "discussed" ? "회사와 논의 있음" : "논의 없음"}`,
    );
  }
  if (companyReaction) noteLines.push(`[회사 반응] ${companyReaction}`);
  if (workRelation) {
    noteLines.push(
      `[업무 연관성] ${WORK_RELATION_LABEL[String(workRelation)] ?? workRelation}`,
    );
  }
  if (sanjaeIntent) {
    noteLines.push(
      `[산재 신청 의향] ${SANJAE_INTENT_LABEL[String(sanjaeIntent)] ?? sanjaeIntent}`,
    );
  }
  if (additionalComment) {
    for (const raw of String(additionalComment).split("\n")) {
      const trimmed = raw.trim();
      if (trimmed) noteLines.push(trimmed);
    }
  }
  const notes = noteLines.length > 0 ? noteLines.join("\n") : null;
  const diseaseCategory = resolveDiseaseCategoryForInsert(categoryStr, notes);

  const insertPayload: Record<string, unknown> = {
    customer_name: String(name).trim(),
    phone: String(phone).trim(),
    disease_name: diseaseName,
    consultation_status: LEAD_INTAKE_DEFAULT_STATUS,
    referral_source: resolvedReferralSource,
    referred_by_user_id: referredByUserId,
    master_agent_id: masterAgentId,
    notes,
  };

  if (pdfUrl) {
    insertPayload.pdf_url = pdfUrl;
  }

  return insertLeadWithFallback(supabase, insertPayload, {
    diseaseCategory,
    pdfUrl: pdfUrl ?? null,
  });
}

export async function updateLeadContractPdf(
  supabase: SupabaseClient,
  leadId: string,
  pdfUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("docs_status")
    .eq("id", leadId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const prevDocs =
    existing?.docs_status && typeof existing.docs_status === "object"
      ? (existing.docs_status as Record<string, unknown>)
      : {};

  const docs_status = {
    ...prevDocs,
    mandateContract: true,
  };

  const fullPayload = {
    pdf_url: pdfUrl,
    has_weim: true,
    docs_status,
  };

  let { error: updateError } = await supabase
    .from("leads")
    .update(fullPayload)
    .eq("id", leadId);

  if (updateError && /has_weim/i.test(updateError.message ?? "")) {
    ({ error: updateError } = await supabase
      .from("leads")
      .update({ pdf_url: pdfUrl, docs_status })
      .eq("id", leadId));
  }

  if (updateError && /docs_status/i.test(updateError.message ?? "")) {
    ({ error: updateError } = await supabase
      .from("leads")
      .update({ pdf_url: pdfUrl, has_weim: true })
      .eq("id", leadId));
  }

  if (updateError && /has_weim|docs_status/i.test(updateError.message ?? "")) {
    ({ error: updateError } = await supabase
      .from("leads")
      .update({ pdf_url: pdfUrl })
      .eq("id", leadId));
  }

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

/** @deprecated updateLeadContractPdf 사용 */
export async function updateLeadPdfUrl(
  supabase: SupabaseClient,
  leadId: string,
  pdfUrl: string,
): Promise<boolean> {
  const result = await updateLeadContractPdf(supabase, leadId, pdfUrl);
  return result.ok;
}
