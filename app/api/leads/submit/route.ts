import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── 레이블 매핑 ────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  ear:   "귀 질환 (이명·난청)",
  joint: "관절/허리 질환 (디스크 등)",
  lung:  "폐·호흡기 질환 (진폐·숨참 등)",
  heart: "뇌·심장 질환 (과로·뇌출혈 등)",
};

const CURRENT_STATUS_LABEL: Record<string, string> = {
  working:             "재직 중",
  "considering-leave": "휴직 고려 중",
  "considering-quit":  "퇴직 고려 중",
  "already-left":      "이미 퇴직",
};

const WORK_RELATION_LABEL: Record<string, string> = {
  "work-related": "업무 관련 있다고 생각",
  "not-sure":     "모르겠음",
  "not-related":  "업무와 관련 없을 것 같음",
};

const SANJAE_INTENT_LABEL: Record<string, string> = {
  yes:         "신청 의향 있음",
  considering: "고려 중",
  "not-sure":  "모르겠음",
  no:          "신청 의향 없음",
};

// ── 유틸: Supabase 클라이언트 생성 ─────────────────────────
function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  if (!serviceKey) throw new Error("ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY가 없습니다.");

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── POST /api/leads/submit ──────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. 요청 본문 파싱
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const {
    name, phone, age, job,
    category, diagnosisName,
    workYears, hasDiagnosis, hospitalName,
    currentStatus, companyAwareness, sanjaeDiscussion, companyReaction,
    workRelation, sanjaeIntent, additionalComment,
    refCode,
  } = body as Record<string, string | boolean | null | undefined>;

  // 2. 필수값 검증
  if (!name || String(name).trim() === "") {
    return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
  }
  if (!phone || String(phone).trim() === "") {
    return NextResponse.json({ error: "연락처는 필수입니다." }, { status: 400 });
  }

  // 3. Supabase 클라이언트 초기화
  let supabase: ReturnType<typeof makeSupabaseClient>;
  try {
    supabase = makeSupabaseClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[leads/submit] Supabase 초기화 실패:", msg);
    return NextResponse.json(
      { error: `서버 설정 오류: ${msg}` },
      { status: 500 },
    );
  }

  // 4. 질환명 조합
  const categoryStr = String(category ?? "");
  const diagnosisStr = String(diagnosisName ?? "").trim();
  const categoryLabel = CATEGORY_LABEL[categoryStr] ?? "기타 질환";
  const diseaseName = diagnosisStr
    ? `${categoryLabel} (진단명: ${diagnosisStr})`
    : categoryLabel;

  // 5. 레퍼럴 코드 처리 (URL ?ref=CODE)
  const refCodeStr = refCode ? String(refCode).trim() : null;
  let referredByUserId: string | null = null;
  let masterAgentId: string | null = null;

  if (refCodeStr) {
    const { data: agent, error: agentErr } = await supabase
      .from("users")
      .select("id, role, parent_agent_id")
      .eq("agent_id", refCodeStr)
      .maybeSingle();

    if (agentErr) {
      console.warn("[leads/submit] 레퍼럴 조회 오류 (무시하고 계속):", agentErr.message);
    } else if (agent) {
      referredByUserId = agent.id as string;
      if (agent.role === "하위영업자" && agent.parent_agent_id) {
        masterAgentId = agent.parent_agent_id as string;
      } else if (agent.role === "총판영업자") {
        masterAgentId = agent.id as string;
      }
    } else {
      console.warn(`[leads/submit] ref="${refCodeStr}" 에 해당하는 영업자 없음`);
    }
  }

  // 6. 설문 답변 notes 조합
  const noteLines: string[] = [];
  if (age)              noteLines.push(`[나이] ${age}세`);
  if (job)              noteLines.push(`[직업] ${job}`);
  if (workYears)        noteLines.push(`[근무기간] ${workYears}`);
  if (hasDiagnosis !== null && hasDiagnosis !== undefined)
    noteLines.push(`[진단 여부] ${hasDiagnosis ? "진단 받음" : "미진단"}`);
  if (hospitalName)     noteLines.push(`[병원] ${hospitalName}`);
  if (currentStatus)    noteLines.push(`[현재 상태] ${CURRENT_STATUS_LABEL[String(currentStatus)] ?? currentStatus}`);
  if (companyAwareness) noteLines.push(`[회사 인지] ${companyAwareness === "informed" ? "회사가 알고 있음" : "회사가 모름"}`);
  if (sanjaeDiscussion) noteLines.push(`[산재 논의] ${sanjaeDiscussion === "discussed" ? "회사와 논의 있음" : "논의 없음"}`);
  if (companyReaction)  noteLines.push(`[회사 반응] ${companyReaction}`);
  if (workRelation)     noteLines.push(`[업무 연관성] ${WORK_RELATION_LABEL[String(workRelation)] ?? workRelation}`);
  if (sanjaeIntent)     noteLines.push(`[산재 신청 의향] ${SANJAE_INTENT_LABEL[String(sanjaeIntent)] ?? sanjaeIntent}`);
  if (additionalComment) noteLines.push(`[고객 추가 의견] ${additionalComment}`);
  const notes = noteLines.length > 0 ? noteLines.join("\n") : null;

  // 7. leads 테이블에 INSERT
  const insertPayload = {
    customer_name:       String(name).trim(),
    phone:               String(phone).trim(),
    disease_name:        diseaseName,
    consultation_status: "신규",
    referral_source:     refCodeStr,
    referred_by_user_id: referredByUserId,
    master_agent_id:     masterAgentId,
    notes,
  };

  console.log("[leads/submit] INSERT 시도:", {
    customer_name: insertPayload.customer_name,
    phone: insertPayload.phone,
    referral_source: insertPayload.referral_source,
  });

  const { error: insertError } = await supabase.from("leads").insert(insertPayload);

  if (insertError) {
    console.error("[leads/submit] DB INSERT 실패:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });
    return NextResponse.json(
      {
        error: `데이터 저장 실패: ${insertError.message}`,
        debug: {
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details,
        },
      },
      { status: 500 },
    );
  }

  console.log("[leads/submit] ✅ 접수 성공:", insertPayload.customer_name, insertPayload.phone);
  return NextResponse.json({ success: true });
}
