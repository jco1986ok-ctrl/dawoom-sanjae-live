"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  fetchV2Notifications,
  fetchV2NotificationsForUser,
  type V2Notification,
} from "../_actions/collaboration";
import { playV2NotificationSound } from "../_lib/v2-notification-sound";
import { notifyV2NotificationsRefresh } from "./V2NotificationBell";

const POLL_MS = 5_000;

interface Props {
  /** 직책 테스트 시 시뮬레이션 대상 users.id */
  notifyUserId: string;
  /** true면 fetchV2NotificationsForUser (마스터 시뮬레이션) */
  simulateUser?: boolean;
  enabled?: boolean;
}

export default function V2NotificationToastListener({
  notifyUserId,
  simulateUser = false,
  enabled = true,
}: Props) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !notifyUserId) return;

    const load = async (): Promise<V2Notification[]> => {
      const result = simulateUser
        ? await fetchV2NotificationsForUser(notifyUserId)
        : await fetchV2Notifications();
      return result.notifications;
    };

    const poll = async () => {
      const notifications = await load();
      const unread = notifications.filter((n) => !n.readAt);

      if (!bootstrappedRef.current) {
        unread.forEach((n) => seenIdsRef.current.add(n.id));
        bootstrappedRef.current = true;
        return;
      }

      for (const item of unread) {
        if (seenIdsRef.current.has(item.id)) continue;
        if (item.kind === "reminder") continue;
        seenIdsRef.current.add(item.id);

        playV2NotificationSound();
        toast(item.message, {
          position: "bottom-right",
          duration: 8000,
          description:
            item.kind === "handoff"
              ? "바통 터치 알림"
              : "새 알림",
          action: {
            label: "확인",
            onClick: () => notifyV2NotificationsRefresh(),
          },
        });
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, notifyUserId, simulateUser]);

  return null;
}
