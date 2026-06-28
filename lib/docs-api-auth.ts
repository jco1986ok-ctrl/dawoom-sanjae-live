import { createClient } from "@/lib/supabase/server";
import { canAdminManageLeadDocuments, normalizeDocsMatrixRole } from "@/lib/lead-docs-status";

export async function assertDocumentsApiAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  if (!role || normalizeDocsMatrixRole(role) === null) {
    return { ok: false as const, status: 403, error: "서류 열람·다운로드 권한이 없습니다." };
  }

  return { ok: true as const, user, role, supabase };
}

/** 마스터·총괄·대표노무사·노무사 — 서류 수동 업로드 */
export async function assertAdminDocumentsUploadAccess() {
  const auth = await assertDocumentsApiAccess();
  if (!auth.ok) return auth;

  if (!canAdminManageLeadDocuments(auth.role)) {
    return { ok: false as const, status: 403, error: "서류 업로드 권한이 없습니다." };
  }

  return auth;
}
