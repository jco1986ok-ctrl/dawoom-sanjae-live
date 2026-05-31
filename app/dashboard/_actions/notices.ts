"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_NOTICES } from "@/lib/notices-fallback";
import type { Notice } from "@/lib/types";

export type NoticeActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function fetchRecentNotices(limit = 2): Promise<Notice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, content, is_important, created_at")
    .order("is_important", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return FALLBACK_NOTICES.slice(0, limit);
  }

  return data as Notice[];
}

export async function createNoticeAction(
  _prev: NoticeActionResult | null,
  formData: FormData,
): Promise<NoticeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "관리자") {
    return { success: false, error: "공지사항 작성 권한이 없습니다." };
  }

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const isImportant = formData.get("is_important") === "on";

  if (!title || !content) {
    return { success: false, error: "제목과 본문을 모두 입력해 주세요." };
  }

  const { error } = await supabase.from("notices").insert({
    title,
    content,
    is_important: isImportant,
  });

  if (error) {
    return { success: false, error: "공지 등록에 실패했습니다. notices 테이블을 확인해 주세요." };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true, message: "공지사항이 등록되었습니다." };
}
