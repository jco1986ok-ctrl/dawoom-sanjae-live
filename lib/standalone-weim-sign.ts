import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  ContractPdfAssetError,
  generateMergedContractPdf,
} from "@/lib/contract-pdf";
import {
  buildPdfFieldsFromLead,
  getWeimSignMissingInfo,
  getWeimSignPrefill,
  leadHasWeimSigned,
} from "@/lib/lead-contract-fields";
import {
  mergeWeimCustomerInfoIntoNotes,
  validateWeimCustomerInfo,
  type WeimCustomerInfoInput,
} from "@/lib/merge-lead-weim-info";
import { updateLeadContractPdf } from "@/lib/leads-insert";

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  if (!serviceKey) throw new Error("ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY가 없습니다.");

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidLeadId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function loadLeadForWeimSign(leadId: string) {
  if (!isValidLeadId(leadId)) return null;

  const supabase = makeSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, customer_name, phone, notes, pdf_url, has_weim")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getWeimSignPageState(leadId: string) {
  const lead = await loadLeadForWeimSign(leadId);
  if (!lead) {
    return { status: "not_found" as const };
  }

  if (leadHasWeimSigned(lead)) {
    return {
      status: "already_signed" as const,
      customerName: lead.customer_name,
    };
  }

  const missingInfo = getWeimSignMissingInfo(lead.notes);
  const prefill = getWeimSignPrefill(lead.notes);
  const needsInfo =
    missingInfo.residentNumber || missingInfo.address || missingInfo.consent;

  return {
    status: "ready" as const,
    customerName: lead.customer_name,
    needsInfo,
    missingInfo,
    prefill,
  };
}

export async function completeWeimSignForLead(
  leadId: string,
  signature: string,
  customerInfo?: WeimCustomerInfoInput,
): Promise<
  | { ok: true; leadId: string; pdfUrl: string }
  | { ok: false; status: number; error: string }
> {
  const lead = await loadLeadForWeimSign(leadId);
  if (!lead) {
    return { ok: false, status: 404, error: "고객 정보를 찾을 수 없습니다." };
  }

  if (leadHasWeimSigned(lead)) {
    return {
      ok: false,
      status: 409,
      error: "이미 위임장 서명이 완료된 고객입니다.",
    };
  }

  const resolvedSignature =
    typeof signature === "string" && signature.startsWith("data:image/")
      ? signature
      : null;
  if (!resolvedSignature) {
    return {
      ok: false,
      status: 400,
      error: "서명 이미지가 올바르지 않습니다.",
    };
  }

  const missingInfo = getWeimSignMissingInfo(lead.notes);
  const needsInfo =
    missingInfo.residentNumber || missingInfo.address || missingInfo.consent;

  if (needsInfo) {
    if (!customerInfo) {
      return {
        ok: false,
        status: 422,
        error: "위임장 작성에 필요한 정보를 입력해 주세요.",
      };
    }
    const validation = validateWeimCustomerInfo(customerInfo);
    if (!validation.ok) {
      return { ok: false, status: 422, error: validation.error };
    }
  }

  const supabase = makeSupabaseClient();
  let leadForPdf = lead;

  if (customerInfo) {
    const mergedNotes = mergeWeimCustomerInfoIntoNotes(lead.notes, customerInfo);
    const { error: notesError } = await supabase
      .from("leads")
      .update({ notes: mergedNotes })
      .eq("id", leadId);

    if (notesError) {
      console.error("[standalone-weim-sign] notes update", notesError);
      return {
        ok: false,
        status: 500,
        error: "고객 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    leadForPdf = { ...lead, notes: mergedNotes };
  }

  const pdfOverrides = customerInfo
    ? {
        address: customerInfo.address.trim(),
        residentNumberFront: customerInfo.residentNumberFront.replace(/\D/g, ""),
        residentNumberBack: customerInfo.residentNumberBack.replace(/\D/g, ""),
      }
    : undefined;

  const fieldsResult = buildPdfFieldsFromLead(leadForPdf, pdfOverrides);
  if (!fieldsResult.ok) {
    return { ok: false, status: 422, error: fieldsResult.error };
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateMergedContractPdf(fieldsResult.pdfFields, resolvedSignature);
  } catch (err) {
    console.error("[standalone-weim-sign] PDF 합성 실패:", err);
    if (err instanceof ContractPdfAssetError) {
      return { ok: false, status: 500, error: err.message };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 500, error: `PDF 생성 실패: ${msg}` };
  }

  const storagePath = `contracts/${leadId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[standalone-weim-sign] storage upload", uploadError);
    return {
      ok: false,
      status: 500,
      error: "위임장 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const updateResult = await updateLeadContractPdf(supabase, leadId, storagePath);
  if (!updateResult.ok) {
    console.error("[standalone-weim-sign] DB update", updateResult.error);
    return {
      ok: false,
      status: 500,
      error: "위임장 정보 저장에 실패했습니다. 담당자에게 문의해 주세요.",
    };
  }

  revalidatePath("/dashboard", "layout");

  return { ok: true, leadId, pdfUrl: storagePath };
}
