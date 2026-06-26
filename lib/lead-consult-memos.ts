/** leads.notes 필드에 저장되는 노무사 상담 메모 형식 (스키마 변경 없음) */
const MEMO_LINE = /^\[노무사 메모 (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.+)$/;
const STATUS_LINE = /^\[상태 변경 (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.+)$/;
const SYSTEM_LOG_LINE =
  /^\[시스템 로그 (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.+)$/;

export interface ParsedConsultMemo {
  id: string;
  createdAt: string;
  content: string;
}

/** UI 타임라인용 코멘트 (notes에서 파싱) */
export interface ConsultComment {
  id: string;
  date: string;
  author: string;
  text: string;
  kind: "memo" | "status";
}

export function parseConsultMemos(notes: string | null | undefined): ParsedConsultMemo[] {
  if (!notes?.trim()) return [];
  const out: ParsedConsultMemo[] = [];
  let idx = 0;
  for (const line of notes.split("\n")) {
    const m = line.match(MEMO_LINE);
    if (!m) continue;
    const [, stamp, content] = m;
    const iso = stamp.replace(" ", "T") + ":00";
    out.push({
      id: `memo-${idx++}`,
      createdAt: iso,
      content: content.trim(),
    });
  }
  return out;
}

export function parseConsultTimeline(notes: string | null | undefined): ConsultComment[] {
  if (!notes?.trim()) return [];
  const out: ConsultComment[] = [];
  let idx = 0;

  for (const line of notes.split("\n")) {
    const memoMatch = line.match(MEMO_LINE);
    if (memoMatch) {
      const [, stamp, content] = memoMatch;
      out.push({
        id: `tl-${idx++}`,
        date: stamp.replace(" ", "T") + ":00",
        author: "노무사",
        text: content.trim(),
        kind: "memo",
      });
      continue;
    }

    const statusMatch = line.match(STATUS_LINE);
    if (statusMatch) {
      const [, stamp, changeText] = statusMatch;
      out.push({
        id: `tl-${idx++}`,
        date: stamp.replace(" ", "T") + ":00",
        author: "진행상태",
        text: changeText.trim(),
        kind: "status",
      });
      continue;
    }

    const systemMatch = line.match(SYSTEM_LOG_LINE);
    if (systemMatch) {
      const [, stamp, content] = systemMatch;
      out.push({
        id: `tl-${idx++}`,
        date: stamp.replace(" ", "T") + ":00",
        author: "시스템",
        text: content.trim(),
        kind: "status",
      });
    }
  }

  return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatConsultMemoLine(content: string, at = new Date()): string {
  const y = at.getFullYear();
  const mo = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  const h = String(at.getHours()).padStart(2, "0");
  const mi = String(at.getMinutes()).padStart(2, "0");
  return `[노무사 메모 ${y}-${mo}-${d} ${h}:${mi}] ${content.trim()}`;
}

export function formatStatusChangeLine(fromStatus: string, toStatus: string, at = new Date()): string {
  const y = at.getFullYear();
  const mo = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  const h = String(at.getHours()).padStart(2, "0");
  const mi = String(at.getMinutes()).padStart(2, "0");
  return `[상태 변경 ${y}-${mo}-${d} ${h}:${mi}] ${fromStatus} → ${toStatus}`;
}

export function formatV2StatusChangeSystemLog(
  fromStatus: string,
  toStatus: string,
  reason: string,
  at = new Date(),
): string {
  const y = at.getFullYear();
  const mo = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  const h = String(at.getHours()).padStart(2, "0");
  const mi = String(at.getMinutes()).padStart(2, "0");
  return `[시스템 로그 ${y}-${mo}-${d} ${h}:${mi}] 상태 변경: ${fromStatus} → ${toStatus} — ${reason.trim()}`;
}

export function appendV2StatusChangeWithReasonToNotes(
  existing: string | null | undefined,
  fromStatus: string,
  toStatus: string,
  reason: string,
): string {
  const line = formatV2StatusChangeSystemLog(fromStatus, toStatus, reason);
  const base = existing?.trim() ?? "";
  return base ? `${base}\n${line}` : line;
}

export function appendConsultMemoToNotes(
  existing: string | null | undefined,
  content: string,
): string {
  const line = formatConsultMemoLine(content);
  const base = existing?.trim() ?? "";
  return base ? `${base}\n${line}` : line;
}

export function appendStatusChangeToNotes(
  existing: string | null | undefined,
  fromStatus: string,
  toStatus: string,
): string {
  const line = formatStatusChangeLine(fromStatus, toStatus);
  const base = existing?.trim() ?? "";
  return base ? `${base}\n${line}` : line;
}
