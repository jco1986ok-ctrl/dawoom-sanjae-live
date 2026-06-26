"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendV2ReminderNotification } from "../_actions/collaboration";
import { notifyV2NotificationsRefresh } from "./V2NotificationBell";
import type { V2CustomerDetailRow } from "../_lib/v2-customer-detail";

interface Props {
  row: V2CustomerDetailRow;
}

export default function V2ReminderButton({ row }: Props) {
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendV2ReminderNotification(row.id, memo);
      if (result.success) {
        toast.success("독촉 알림을 담당자에게 전송했습니다.");
        setMemo("");
        notifyV2NotificationsRefresh();
      } else {
        toast.error(result.error ?? "독촉 알림 전송에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2">
        <BellRing className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          독촉 알림
        </span>
        {row.assignedUserName && (
          <span className="text-[11px] text-slate-400 ml-auto">
            담당: <strong className="text-slate-700">{row.assignedUserName}</strong>
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="독촉 메모 (선택)"
          className="flex-1 text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5
            focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !row.assignedUserId}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
            bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 min-h-[44px] shrink-0"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BellRing className="w-4 h-4" />
          )}
          독촉 알림
        </button>
      </div>

      {!row.assignedUserId && (
        <p className="text-[11px] text-amber-700">담당자 배정 후 독촉할 수 있습니다.</p>
      )}
    </div>
  );
}
