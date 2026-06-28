import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DASHBOARD_ROLES = new Set([
  "관리자",
  "노무사",
  "대표노무사",
  "총괄공식파트너",
  "총판영업자",
  "하위영업자",
]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await context.params;

  if (!leadId) {
    return NextResponse.json({ error: "leadId가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role || !DASHBOARD_ROLES.has(profile.role as string)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("pdf_url, customer_name")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !lead?.pdf_url) {
    return NextResponse.json(
      { error: "저장된 계약서 PDF가 없습니다." },
      { status: 404 },
    );
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from("documents")
    .download(lead.pdf_url);

  if (downloadError || !fileData) {
    console.error("[contract-pdf] download 실패:", downloadError);
    return NextResponse.json(
      { error: "PDF 파일을 불러올 수 없습니다." },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const safeName = String(lead.customer_name ?? "고객").replace(/[^\w가-힣.-]/g, "_");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}_위임장_계약서.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
