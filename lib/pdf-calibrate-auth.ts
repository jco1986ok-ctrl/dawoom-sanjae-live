import { createClient } from "@/lib/supabase/server";

export async function assertPdfCalibrateAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "관리자") {
    return { ok: false, status: 403, error: "관리자(마스터)만 사용할 수 있습니다." };
  }

  return { ok: true, userId: user.id };
}
