import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { FormData, LeadGrade } from "@/components/DynamicForm";
import {
  buildContractPdfFields,
  ContractPdfAssetError,
  generateMergedContractPdf,
  getLoadedFontFileName,
  saveContractPdfLocally,
} from "@/lib/contract-pdf";
import { mapDynamicFormToLeadSubmit } from "@/lib/map-dynamic-form-to-lead";
import { insertLeadFromPayload, updateLeadContractPdf } from "@/lib/leads-insert";
import type { LeadDocKey } from "@/lib/lead-doc-files";
import {
  buildDocsStatusAfterUpload,
  buildLeadDocStoragePath,
  validateUploadFile,
} from "@/lib/lead-doc-upload";
import { createIntakeUploadToken } from "@/lib/intake-upload-token";

export interface GenerateContractBody {
  formData: FormData;
  signature?: string;
  signatureUrl?: string;
  internalGrade?: LeadGrade | null;
  refCode?: string | null;
  partnerName?: string | null;
  referrer?: string;
  /** true: PDF Blob만 반환 (테스트). false: Supabase 저장 */
  testMode?: boolean;
}

export type PatientDocumentFiles = {
  diagnosis?: File;
  companyDoc?: File;
};

function isNonEmptyUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function collectUploadFiles(form: globalThis.FormData, key: string): File[] {
  return form
    .getAll(key)
    .filter(isNonEmptyUploadFile);
}

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  if (!serviceKey) throw new Error("ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY가 없습니다.");

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function resolveContractSignature(body: GenerateContractBody): string | null {
  const value = body.signature ?? body.signatureUrl;
  if (typeof value === "string" && value.startsWith("data:image/")) {
    return value;
  }
  return null;
}

export function pdfBlobResponse(pdfBytes: Uint8Array, filename: string) {
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(pdfBytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

export function resolveContractTestMode(body: GenerateContractBody, defaultTestMode: boolean): boolean {
  if (body.testMode === true) return true;
  if (body.testMode === false) return false;
  return defaultTestMode || process.env.PDF_TEST_MODE === "true";
}

function intakeUploadExtras(leadId: string): { uploadToken?: string } {
  try {
    return { uploadToken: createIntakeUploadToken(leadId) };
  } catch (tokenErr) {
    console.warn("[generate-contract] intake upload token 생성 실패:", tokenErr);
    return {};
  }
}

function isStorageBucketMissing(message: string): boolean {
  return /bucket not found|Bucket not found|404/i.test(message);
}

export function contractAssetErrorResponse(err: ContractPdfAssetError) {
  return NextResponse.json(
    {
      error: err.message,
      missingFiles: err.missingFiles,
      hint: "public/ 폴더에 nanum.ttf(또는 NanumBarunGothic.ttf), weim.pdf, daeri.pdf, yakjung.pdf 가 필요합니다.",
    },
    { status: 500 },
  );
}

/** UI 마스킹(•) 문자가 PDF 필드에 섞이지 않도록 정제 */
export function sanitizeResidentDigits(raw: string, expectedLen: number): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.slice(0, expectedLen);
}

export function buildContractDownloadFilename(customerName: string): string {
  const safe = customerName.trim().replace(/[^\w가-힣.-]/g, "_") || "고객";
  return `파로스_위임계약서_${safe}.pdf`;
}

async function uploadPatientDocumentFile(
  supabase: ReturnType<typeof makeSupabaseClient>,
  leadId: string,
  docKey: LeadDocKey,
  file: File,
  prevDocsStatus: unknown,
): Promise<{ docsStatus: Record<string, unknown>; error?: string }> {
  const validationError = validateUploadFile(file);
  if (validationError) {
    return { docsStatus: {}, error: validationError };
  }

  const mimeType = file.type || "application/octet-stream";
  const storagePath = buildLeadDocStoragePath(leadId, docKey, file.name);
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return { docsStatus: {}, error: uploadError.message };
  }

  const docsStatus = buildDocsStatusAfterUpload(prevDocsStatus, docKey, {
    storagePath,
    fileName: file.name,
    mimeType,
  });

  return { docsStatus };
}

export async function parseGenerateContractRequest(
  request: Request,
): Promise<{ body: GenerateContractBody; patientFiles?: PatientDocumentFiles } | { error: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: globalThis.FormData;
    try {
      form = await request.formData();
    } catch {
      return { error: "multipart 요청을 읽을 수 없습니다." };
    }

    const formDataRaw = form.get("formData");
    if (typeof formDataRaw !== "string" || !formDataRaw.trim()) {
      return { error: "formData 필드가 필요합니다." };
    }

    let formData: FormData;
    try {
      formData = JSON.parse(formDataRaw) as FormData;
    } catch {
      return { error: "formData JSON 형식이 올바르지 않습니다." };
    }

    const signature = form.get("signature");
    const diagnosisFiles = collectUploadFiles(form, "diagnosis");
    const companyDocFiles = collectUploadFiles(form, "companyDoc");

    const body: GenerateContractBody = {
      formData,
      signature: typeof signature === "string" ? signature : undefined,
      internalGrade: (form.get("internalGrade") as LeadGrade | null) || null,
      refCode: (form.get("refCode") as string | null) || null,
      partnerName: (form.get("partnerName") as string | null) || null,
      referrer: (form.get("referrer") as string) || undefined,
      testMode: form.get("testMode") === "true",
    };

    const patientFiles: PatientDocumentFiles = {};
    if (diagnosisFiles.length > 0) patientFiles.diagnosis = diagnosisFiles[0];
    if (companyDocFiles.length > 0) patientFiles.companyDoc = companyDocFiles[0];

    if (patientFiles.diagnosis || patientFiles.companyDoc) {
      return { body, patientFiles };
    }

    return { body };
  }

  try {
    const body = (await request.json()) as GenerateContractBody;
    return { body };
  } catch {
    return { error: "잘못된 JSON 요청 형식입니다." };
  }
}

/**
 * formData + 서명 → 3종 PDF 병합
 * - testMode: Blob 응답
 * - production: leads INSERT + Storage + pdf_url
 */
export async function handleGenerateContract(
  body: GenerateContractBody,
  options: { defaultTestMode?: boolean; patientFiles?: PatientDocumentFiles } = {},
): Promise<NextResponse> {
  const { formData } = body;
  const signature = resolveContractSignature(body);

  if (!formData?.name?.trim()) {
    return NextResponse.json({ error: "이름(formData.name)은 필수입니다." }, { status: 400 });
  }
  if (!formData?.phone?.trim()) {
    return NextResponse.json({ error: "연락처(formData.phone)는 필수입니다." }, { status: 400 });
  }
  if (!signature) {
    return NextResponse.json(
      {
        error: "서명 이미지(signature)가 필요합니다.",
        hint: "data:image/png;base64,... 형식",
      },
      { status: 400 },
    );
  }

  const residentFront = sanitizeResidentDigits(formData.residentNumberFront ?? "", 6);
  const residentBack = sanitizeResidentDigits(formData.residentNumberBack ?? "", 7);

  if (residentFront.length !== 6 || residentBack.length !== 7) {
    return NextResponse.json(
      { error: "주민등록번호 앞 6자리·뒤 7자리를 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  const pdfFields = buildContractPdfFields({
    name: formData.name,
    phone: formData.phone,
    address: formData.address,
    addressBase: formData.addressBase,
    addressDetail: formData.addressDetail,
    zonecode: formData.zonecode,
    residentNumberFront: residentFront,
    residentNumberBack: residentBack,
  });

  let pdfBytes: Uint8Array;

  try {
    pdfBytes = await generateMergedContractPdf(pdfFields, signature);
  } catch (err) {
    console.error("[generate-contract] PDF 합성 실패:", err);
    if (err instanceof ContractPdfAssetError) {
      return contractAssetErrorResponse(err);
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PDF 생성 실패: ${msg}` }, { status: 500 });
  }

  const downloadName = buildContractDownloadFilename(pdfFields.name);
  const testMode = resolveContractTestMode(body, options.defaultTestMode ?? false);

  if (testMode) {
    try {
      await saveContractPdfLocally(pdfBytes, downloadName);
    } catch (saveErr) {
      console.warn("[generate-contract] 로컬 백업 저장 실패:", saveErr);
    }
    return pdfBlobResponse(pdfBytes, downloadName);
  }

  let supabase: ReturnType<typeof makeSupabaseClient>;
  try {
    supabase = makeSupabaseClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `서버 설정 오류: ${msg}` }, { status: 500 });
  }

  const leadPayload = mapDynamicFormToLeadSubmit(formData, {
    internalGrade: body.internalGrade ?? null,
    refCode: body.refCode ?? null,
    partnerName: body.partnerName ?? null,
    referrer: body.referrer,
  });

  const insertResult = await insertLeadFromPayload(supabase, leadPayload);
  if (!insertResult.success) {
    return NextResponse.json(
      { error: insertResult.error, debug: insertResult.debug },
      { status: 500 },
    );
  }

  const leadId = insertResult.leadId;
  const storagePath = `contracts/${leadId}.pdf`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      if (isStorageBucketMissing(uploadError.message ?? "")) {
        revalidatePath("/dashboard", "layout");
        return NextResponse.json({
          success: true,
          leadId,
          pdfUrl: null,
          pageCount: 3,
          fontUsed: getLoadedFontFileName(),
          warning: "PDF는 생성되었으나 Storage 버킷(documents)이 없어 저장을 건너뛰었습니다.",
          ...intakeUploadExtras(leadId),
        });
      }
      return NextResponse.json(
        { error: `PDF Storage 저장 실패: ${uploadError.message}`, leadId },
        { status: 500 },
      );
    }
  } catch (uploadErr) {
    const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
    if (isStorageBucketMissing(msg)) {
      revalidatePath("/dashboard", "layout");
      return NextResponse.json({
        success: true,
        leadId,
        pdfUrl: null,
        pageCount: 3,
        fontUsed: getLoadedFontFileName(),
        warning: "PDF는 생성되었으나 Storage 버킷(documents)이 없어 저장을 건너뛰었습니다.",
        ...intakeUploadExtras(leadId),
      });
    }
    return NextResponse.json(
      { error: `PDF Storage 저장 중 오류: ${msg}`, leadId },
      { status: 500 },
    );
  }

  const updateResult = await updateLeadContractPdf(supabase, leadId, storagePath);
  if (!updateResult.ok) {
    console.error("[generate-contract] DB 업데이트 실패:", updateResult.error);
    return NextResponse.json(
      {
        error: `계약서는 저장됐으나 고객 정보 업데이트 실패: ${updateResult.error ?? "알 수 없음"}`,
        leadId,
        pdfUrl: storagePath,
      },
      { status: 500 },
    );
  }

  let docsStatusPatch: Record<string, unknown> | undefined;
  const patientFiles = options.patientFiles;

  if (patientFiles?.diagnosis || patientFiles?.companyDoc) {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("docs_status")
      .eq("id", leadId)
      .maybeSingle();

    let rollingDocs = leadRow?.docs_status ?? {};

    if (patientFiles.diagnosis) {
      const diagnosisUpload = await uploadPatientDocumentFile(
        supabase,
        leadId,
        "diagnosisReport",
        patientFiles.diagnosis,
        rollingDocs,
      );
      if (diagnosisUpload.error) {
        return NextResponse.json(
          { error: `진단서 업로드 실패: ${diagnosisUpload.error}`, leadId },
          { status: 500 },
        );
      }
      rollingDocs = diagnosisUpload.docsStatus;
    }

    if (patientFiles.companyDoc) {
      const companyUpload = await uploadPatientDocumentFile(
        supabase,
        leadId,
        "employmentDocs",
        patientFiles.companyDoc,
        rollingDocs,
      );
      if (companyUpload.error) {
        return NextResponse.json(
          { error: `재직/자격 서류 업로드 실패: ${companyUpload.error}`, leadId },
          { status: 500 },
        );
      }
      docsStatusPatch = companyUpload.docsStatus;
    } else {
      docsStatusPatch = rollingDocs as Record<string, unknown>;
    }

    const { error: docsUpdateError } = await supabase
      .from("leads")
      .update({ docs_status: docsStatusPatch })
      .eq("id", leadId);

    if (docsUpdateError) {
      console.error("[generate-contract] docs_status 업데이트 실패:", docsUpdateError);
    }
  }

  revalidatePath("/dashboard", "layout");

  let uploadToken: string | undefined;
  const extras = intakeUploadExtras(leadId);
  uploadToken = extras.uploadToken;

  return NextResponse.json({
    success: true,
    leadId,
    uploadToken,
    pdfUrl: storagePath,
    hasWeim: true,
    pageCount: 3,
    fontUsed: getLoadedFontFileName(),
    docsUploaded: Boolean(patientFiles?.diagnosis || patientFiles?.companyDoc),
  });
}
