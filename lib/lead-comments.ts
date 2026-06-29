import {
  parseConsultTimeline,
  type ConsultComment,
} from "@/lib/lead-consult-memos";

export interface LeadCommentRow {
  id: string;
  lead_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  kind: "memo" | "status" | "system";
  created_at: string;
}

export function leadCommentRowToConsultComment(row: LeadCommentRow): ConsultComment {
  return {
    id: row.id,
    date: row.created_at,
    author: row.author_name,
    authorId: row.author_id,
    text: row.content,
    kind: row.kind === "memo" ? "memo" : "status",
  };
}

/** DB 코멘트 + notes 내 레거시·시스템 로그 병합 */
export function mergeLeadCommentTimeline(
  notes: string | null | undefined,
  dbRows: LeadCommentRow[],
): ConsultComment[] {
  const fromDb = dbRows.map(leadCommentRowToConsultComment);
  const fromNotes = parseConsultTimeline(notes);

  // notes 에 남아 있는 메모(마이그레이션 전) + status/system 로그
  const legacyMemos = fromNotes.filter((c) => c.kind === "memo");
  const systemEntries = fromNotes.filter((c) => c.kind === "status");

  const merged = [...legacyMemos, ...fromDb, ...systemEntries];
  const seen = new Set<string>();

  return merged
    .filter((c) => {
      const key = `${c.kind}|${c.date}|${c.author}|${c.text.slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function isLeadCommentsTableMissingError(message: string | undefined): boolean {
  if (!message) return false;
  return /lead_comments|schema cache|does not exist|Could not find the table/i.test(message);
}
