"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  fetchV2Notifications,
  markAllV2NotificationsRead,
  markV2NotificationRead,
  type V2Notification,
} from "../_actions/collaboration";

const POLL_MS = 20_000;
const REFRESH_EVENT = "v2-notifications-refresh";

export function notifyV2NotificationsRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export default function V2NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<V2Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const result = await fetchV2Notifications();
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onRefresh = () => void load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [load]);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markV2NotificationRead(id);
      await load();
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllV2NotificationsRead();
      await load();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl
          border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors"
        aria-label="알림"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#0f2d5e]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="알림 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">알림</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f2d5e] hover:underline disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  모두 읽음
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  불러오는 중…
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">새 알림이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.readAt) handleMarkRead(item.id);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                          !item.readAt ? "bg-sky-50/60" : ""
                        }`}
                      >
                        <p className="text-sm text-slate-800 break-keep leading-snug">
                          {item.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                          {new Date(item.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
