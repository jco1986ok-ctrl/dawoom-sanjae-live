"use client";

import V2NotificationBell from "./V2NotificationBell";

/** V2 레이아웃 상단 — 알림 벨 (라이브 대시보드 미사용) */
export default function V2TopToolbar() {
  return (
    <div className="flex items-center justify-end gap-2 px-1">
      <V2NotificationBell />
    </div>
  );
}
