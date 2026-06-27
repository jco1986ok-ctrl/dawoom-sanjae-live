"use client";

import { useState, useTransition } from "react";
import { Loader2, UserRound } from "lucide-react";
import type { AdminUserListItem } from "@/lib/user-lineage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { handoffMyBoardLead } from "../_actions/my-board";

interface Props {
  open: boolean;
  leadId: string | null;
  customerName: string;
  assignableUsers: AdminUserListItem[];
  currentUserId: string;
  onClose: () => void;
  onHandedOff: (leadId: string) => void;
}

export default function HandoffModal({
  open,
  leadId,
  customerName,
  assignableUsers,
  currentUserId,
  onClose,
  onHandedOff,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const options = assignableUsers.filter((u) => u.id !== currentUserId);

  const handleConfirm = () => {
    if (!leadId) return;
    if (!selectedId) {
      setError("다음 담당자를 선택해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await handoffMyBoardLead(leadId, selectedId);
      if (result.success) {
        onHandedOff(leadId);
        setSelectedId("");
        onClose();
      } else {
        setError(result.error ?? "담당자 이관에 실패했습니다.");
      }
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !isPending) {
      setSelectedId("");
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-[#0f2d5e]" />
            담당자 이관
          </DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{customerName}</strong> 건의 다음 담당자를
            선택하세요. 이관 후 내 보드에서 카드가 사라집니다.
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">다음 담당자</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isPending}
            className="w-full text-sm font-medium rounded-lg border border-border bg-background px-3 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
          >
            <option value="">이름을 선택하세요</option>
            {options.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
              bg-[#0f2d5e] text-white hover:bg-[#0a2248] transition-colors disabled:opacity-60"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            이관 완료
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
