"use client";

import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { filterV2ProcessingHandlerUsers } from "@/lib/v2-assignable-users";
import { filterV2MyTaskLeads } from "@/lib/v2-my-tasks";
import { sortV2AssigneeLeads } from "@/lib/v2-task-aging";
import MyBoardKanban, { buildMyBoardCards } from "../my-board/_components/MyBoardKanban";

interface Props {
  leads: LeadDetail[];
  users: AdminUserListItem[];
  viewerUserId: string;
}

/** V2 탭 — 별도 라우트 없이 같은 페이지에서 칸반 표시 */
export default function V2MyBoardTabPanel({ leads, users, viewerUserId }: Props) {
  const myLeads = useMemo(
    () => sortV2AssigneeLeads(filterV2MyTaskLeads(leads, viewerUserId)),
    [leads, viewerUserId],
  );

  const cards = useMemo(() => buildMyBoardCards(myLeads), [myLeads]);
  const assignableUsers = useMemo(() => filterV2ProcessingHandlerUsers(users), [users]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-1">
        <div>
          <p className="text-sm text-muted-foreground">
            처리 담당자로 배정된 접수 건이 여기에 표시됩니다. 칸반에서 단계를 변경하고 다음
            담당자에게 이관할 수 있습니다.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-1.5 shrink-0">
          {cards.length}건
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/80">
          <ClipboardList className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">나에게 배정된 업무가 없습니다.</p>
        </div>
      ) : (
        <MyBoardKanban
          initialCards={cards}
          assignableUsers={assignableUsers}
          currentUserId={viewerUserId}
        />
      )}
    </div>
  );
}
