import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePartnerName,
  resolveMasterAgentId,
  resolveReferrerAgent,
} from "@/lib/referral-resolve";
import { resolveReferrerForInsert } from "@/lib/capture-referrer";
import type { LeadSubmitPayload } from "@/lib/map-dynamic-form-to-lead";
import { resolveDiseaseCategoryForInsert } from "@/lib/disease-category";
import { V2_LEAD_STATUS_DEFAULT } from "@/lib/v2-lead-status";

/** 환자 공개 접수 기본값 — DB enum에 항상 존재하는 레거시 값 */
const LEAD_INTAKE_FALLBACK_STATUS = "신규";

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

  const referrerValue = resolveReferrerForInsert(
    referrer ? String(referrer) : refCodeStr || null,
  );

  const insertPayload: Record<string, unknown> = {
    customer_name: String(name).trim(),
    phone: String(phone).trim(),
    disease_name: diseaseName,
    disease_category: diseaseCategory,
    consultation_status: V2_LEAD_STATUS_DEFAULT,
    referral_source: resolvedReferralSource,
    referrer: referrerValue,
    referred_by_user_id: referredByUserId,
    master_agent_id: masterAgentId,
    notes,
  };

  if (pdfUrl) {
    insertPayload.pdf_url = pdfUrl;
  }

  let { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError && /referrer/i.test(insertError.message ?? "")) {
    const { referrer: _omit, ...withoutReferrer } = insertPayload;
    ({ data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert(withoutReferrer)
      .select("id")
      .single());
  }

  if (insertError && /pdf_url/i.test(insertError.message ?? "")) {
    const { pdf_url: _omit, ...withoutPdf } = insertPayload;
    ({ data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert(withoutPdf)
      .select("id")
      .single());
  }

  if (insertError && /disease_category/i.test(insertError.message ?? "")) {
    const { disease_category: _omit, ...withoutCategory } = insertPayload;
    ({ data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert(withoutCategory)
      .select("id")
      .single());
  }

  if (
    insertError &&
    /lead_status|enum|invalid input value/i.test(insertError.message ?? "")
  ) {
    ({ data: inserted, error: insertError } = await supabase
      .from("leads")
      .insert({ ...insertPayload, consultation_status: LEAD_INTAKE_FALLBACK_STATUS })
      .select("id")
      .single());
  }

  if (insertError || !inserted?.id) {
    return {
      success: false,
      error: `데이터 저장 실패: ${insertError?.message ?? "알 수 없는 오류"}`,
      debug: {
        code: insertError?.code,
        hint: insertError?.hint,
        details: insertError?.details,
      },
    };
  }

  return { success: true, leadId: inserted.id as string };
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
