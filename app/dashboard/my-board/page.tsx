import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchMyBoardLeads } from "@/lib/fetch-my-board-leads";
import { filterV2AssignableUsers } from "@/lib/v2-assignable-users";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import MyBoardKanban, { buildMyBoardCards } from "@/app/dashboard-v2/my-board/_components/MyBoardKanban";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function LiveMyBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: leads, error }, { data: users = [] }] = await Promise.all([
    fetchMyBoardLeads(admin, user.id),
    admin
      .from("users")
      .select("id, name, role, agent_id, is_active, parent_agent_id")
      .eq("is_active", true)
      .order("name"),
  ]);

  const assignableUsers = filterV2AssignableUsers(
    (users ?? []).map(
      (u): AdminUserListItem => ({
        id: u.id as string,
        name: u.name as string,
        role: u.role as UserRole,
        agent_id: u.agent_id as string,
        is_active: u.is_active as boolean,
        parent_agent_id: u.parent_agent_id as string | null,
      }),
    ),
  );

  const cards = buildMyBoardCards(leads);

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← 대시보드로
          </Link>
          <div className="inline-flex items-center gap-2 text-[#0f2d5e] font-black text-lg sm:text-xl">
            <ClipboardList className="w-6 h-6" />
            내 업무 보드
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            나에게 배정된 사건을 칸반보드로 관리합니다. 카드를 드래그해 단계를 변경하고, 다음
            담당자에게 이관할 수 있습니다.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-1.5 shrink-0">
          {cards.length}건
        </div>
      </header>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {cards.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/50">
          <ClipboardList className="w-12 h-12 opacity-30 mb-3" />
          <p className="text-sm font-medium">나에게 배정된 업무가 없습니다.</p>
        </div>
      ) : (
        <MyBoardKanban
          initialCards={cards}
          assignableUsers={assignableUsers}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
