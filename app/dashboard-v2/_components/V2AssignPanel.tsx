"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { V2CustomerDetailRow } from "../_lib/v2-customer-detail";
import { filterV2AssignableUsers } from "@/lib/v2-assignable-users";
import { assignLeadUser } from "../_actions/assignment";

interface Props {
  row: V2CustomerDetailRow;
  users: AdminUserListItem[];
  onAssigned: (patch: {
    assignedUserId: string;
    assignedUserName: string;
    assignmentMemo: string | null;
    isRead: boolean;
  }) => void;
}

export default function V2AssignPanel({ row, users, onAssigned }: Props) {
  const [selectedUserId, setSelectedUserId] = useState(row.assignedUserId ?? "");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const assignableUsers = filterV2AssignableUsers(users);

  const handleSave = () => {
    if (!selectedUserId) {
      setError("다음 담당자를 선택해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await assignLeadUser(row.id, selectedUserId, memo);
      if (result.success) {
        const name = assignableUsers.find((u) => u.id === selectedUserId)?.name ?? "—";
        onAssigned({
          assignedUserId: selectedUserId,
          assignedUserName: name,
          assignmentMemo: memo.trim() || null,
          isRead: false,
        });
        setMemo("");
      } else {
        setError(result.error ?? "배정에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#0f2d5e]" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          다음 담당자 배정
        </span>
        {row.assignedUserName && (
          <span className="text-[11px] text-slate-400 ml-auto">
            현재: <strong className="text-slate-700">{row.assignedUserName}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">담당 직원</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full text-sm font-semibold rounded-xl border border-slate-200 bg-white px-3 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
          >
            <option value="">선택하세요</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500">전달 메모</span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="담당자에게 전달할 내용"
            className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
          bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 min-h-[44px]"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        배정 저장
      </button>

      {row.assignmentMemo && (
        <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          최근 메모: {row.assignmentMemo}
        </p>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
