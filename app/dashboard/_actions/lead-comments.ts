"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isLeadCommentsTableMissingError,
  leadCommentRowToConsultComment,
  mergeLeadCommentTimeline,
  type LeadCommentRow,
} from "@/lib/lead-comments";
import { parseConsultTimeline, type ConsultComment } from "@/lib/lead-consult-memos";

export async function fetchLeadCommentTimeline(
  leadId: string,
  notes: string | null,
): Promise<{ comments: ConsultComment[]; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("lead_comments")
      .select("id, lead_id, author_id, author_name, content, kind, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isLeadCommentsTableMissingError(error.message)) {
        return { comments: parseConsultTimeline(notes) };
      }
      return { comments: parseConsultTimeline(notes), error: error.message };
    }

    return {
      comments: mergeLeadCommentTimeline(notes, (data ?? []) as LeadCommentRow[]),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "코멘트 조회 실패";
    return { comments: parseConsultTimeline(notes), error: msg };
  }
}

export async function insertLeadConsultComment(
  leadId: string,
  authorId: string,
  authorName: string,
  content: string,
): Promise<{ success: boolean; error?: string; comment?: ConsultComment }> {
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "메모 내용을 입력해 주세요." };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("lead_comments")
      .insert({
        lead_id: leadId,
        author_id: authorId,
        author_name: authorName.trim() || "알 수 없음",
        content: trimmed,
        kind: "memo",
      })
      .select("id, lead_id, author_id, author_name, content, kind, created_at")
      .single();

    if (error) {
      if (isLeadCommentsTableMissingError(error.message)) {
        return {
          success: false,
          error:
            "lead_comments 테이블이 없습니다. Supabase SQL Editor에서 supabase/29_lead_comments.sql 을 실행해 주세요.",
        };
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      comment: leadCommentRowToConsultComment(data as LeadCommentRow),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "서버 오류";
    return { success: false, error: msg };
  }
}
