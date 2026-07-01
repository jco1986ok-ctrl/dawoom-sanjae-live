import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  getSlotDefinition,
  type DocCategory,
  type DocSlotId,
} from "@/lib/document-collection-catalog";
import { uploadIntakeDocumentToLead } from "@/lib/intake-documents-upload";
import { verifyIntakeUploadToken } from "@/lib/intake-upload-token";
import type { LeadDocKey } from "@/lib/lead-doc-files";
import { isLeadDocKey } from "@/lib/lead-doc-files";

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  if (!serviceKey) throw new Error("ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY가 없습니다.");

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseCategory(raw: FormDataEntryValue | null): DocCategory | null {
  if (raw === "medical" || raw === "personal" || raw === "institution") return raw;
  return null;
}

/** POST — 접수 직후 고객 추가 서류 업로드 (토큰 인증) */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "업로드 요청을 읽을 수 없습니다." }, { status: 400 });
  }

  const leadId = form.get("leadId");
  const token = form.get("token");
  if (typeof leadId !== "string" || !leadId.trim()) {
    return NextResponse.json({ error: "leadId가 필요합니다." }, { status: 400 });
  }
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ error: "업로드 토큰이 필요합니다." }, { status: 403 });
  }

  if (!verifyIntakeUploadToken(leadId.trim(), token.trim())) {
    return NextResponse.json({ error: "업로드 권한이 없거나 토큰이 만료되었습니다." }, { status: 403 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
  }

  const slotIdRaw = form.get("slotId");
  const categoryRaw = form.get("category");
  const leadDocKeyRaw = form.get("leadDocKey");

  const slotId =
    typeof slotIdRaw === "string" ? (slotIdRaw as DocSlotId) : "diagnosisReport";
  const slotDef = getSlotDefinition(slotId);
  const category = parseCategory(categoryRaw) ?? slotDef?.category ?? "medical";
  const leadDocKey =
    typeof leadDocKeyRaw === "string" && isLeadDocKey(leadDocKeyRaw)
      ? (leadDocKeyRaw as LeadDocKey)
      : slotDef?.leadDocKey;

  let supabase: ReturnType<typeof makeSupabaseClient>;
  try {
    supabase = makeSupabaseClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `서버 설정 오류: ${msg}` }, { status: 500 });
  }

  const result = await uploadIntakeDocumentToLead(supabase, leadId.trim(), file, {
    slotId,
    leadDocKey,
    category,
  });

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error, uploaded: result.uploaded.storagePath ? [result.uploaded] : [] },
      { status: 500 },
    );
  }

  revalidatePath("/dashboard", "layout");

  return NextResponse.json({
    success: true,
    uploaded: [result.uploaded],
  });
}
