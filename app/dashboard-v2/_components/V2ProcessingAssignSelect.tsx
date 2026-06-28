"use client";

import { useState, useTransition } from "react";
import { Loader2, UserRound } from "lucide-react";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { filterV2ProcessingHandlerUsers } from "@/lib/v2-assignable-users";
import { assignLeadUser } from "../_actions/assignment";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  users: AdminUserListItem[];
  editable?: boolean;
  compact?: boolean;
  className?: string;
  onAssigned: (patch: {
    assignedUserId: string;
    assignedUserName: string;
    assignmentMemo: string | null;
    isRead: boolean;
  }) => void;
}

export default function V2ProcessingAssignSelect({
  leadId,
  assignedUserId,
  assignedUserName,
  users,
  editable = false,
  compact = false,
  className,
  onAssigned,
}: Props) {
  const handlers = filterV2ProcessingHandlerUsers(users);
  const [selectedUserId, setSelectedUserId] = useState(assignedUserId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!editable) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold",
          assignedUserName ? "text-slate-700" : "text-slate-400",
          className,
        )}
      >
        <UserRound className="w-3.5 h-3.5 shrink-0 opacity-60" />
        {assignedUserName ?? "미배정"}
      </span>
    );
  }

  const handleChange = (nextUserId: string) => {
    setSelectedUserId(nextUserId);
    if (!nextUserId || nextUserId === assignedUserId) return;

    setError("");
    startTransition(async () => {
      const result = await assignLeadUser(leadId, nextUserId, "");
      if (!result.success) {
        setError(result.error ?? "배정에 실패했습니다.");
        setSelectedUserId(assignedUserId ?? "");
        return;
      }

      const name = handlers.find((u) => u.id === nextUserId)?.name ?? "—";
      onAssigned({
        assignedUserId: nextUserId,
        assignedUserName: name,
        assignmentMemo: null,
        isRead: false,
      });
    });
  };

  return (
    <div className={cn("min-w-0", className)} onClick={(e) => e.stopPropagation()}>
      <label className="sr-only">처리 담당자</label>
      <div className="relative">
        <select
          value={selectedUserId}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className={cn(
            "w-full font-semibold rounded-lg border bg-white text-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 disabled:opacity-60",
            compact
              ? "text-[11px] px-2 py-1.5 border-slate-200"
              : "text-xs px-2.5 py-2 border-slate-200",
            !selectedUserId && "text-slate-400",
          )}
        >
          <option value="">미배정</option>
          {handlers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
