"use client";

import { useState, useTransition, useEffect } from "react";
import { ChevronRight, Inbox, GitBranch, UserCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminUserListItem } from "@/lib/user-lineage";
import { getRecruiterTag } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import {
  canEditUserRole,
  getAssignableRoles,
  USER_ROLE_LABEL,
} from "@/lib/user-role-permissions";
import { updateUserRoleAction } from "../../_actions/users";

const ROLE_STYLE: Record<string, string> = {
  총괄공식파트너: "bg-violet-50 text-violet-700",
  총판영업자: "bg-orange-50 text-orange-700",
  하위영업자: "bg-blue-50 text-blue-700",
  관리자: "bg-red-50 text-red-700",
  노무사: "bg-cyan-50 text-cyan-700",
  대표노무사: "bg-teal-50 text-teal-700",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ROLE_STYLE[role] ?? "bg-gray-100 text-gray-600"}`}
    >
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}

function RoleEditor({
  user,
  viewerRole,
  viewerId,
  onUpdated,
}: {
  user: AdminUserListItem;
  viewerRole: UserRole;
  viewerId: string;
  onUpdated: (userId: string, role: UserRole) => void;
}) {
  const [pending, startTransition] = useTransition();
  const editable = canEditUserRole(user, viewerRole, viewerId);
  const options = getAssignableRoles(viewerRole);

  if (!editable) {
    return <RoleBadge role={user.role} />;
  }

  const handleChange = (newRole: UserRole) => {
    if (newRole === user.role) return;

    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, newRole);
      if (result.success) {
        onUpdated(user.id, newRole);
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <select
        value={user.role}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className={`text-xs font-semibold pl-2.5 pr-7 py-1.5 rounded-full border-2 border-[#0f2d5e]/20 bg-white cursor-pointer appearance-none
          focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 min-w-[7.5rem]
          ${ROLE_STYLE[user.role] ?? "text-gray-700"}
          ${pending ? "opacity-60" : ""}`}
      >
        {options.map((role) => (
          <option key={role} value={role}>
            {USER_ROLE_LABEL[role] ?? role}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      )}
    </div>
  );
}

function LineageFlow({ user }: { user: AdminUserListItem }) {
  const { lineage } = user;

  if (lineage.length === 0) {
    return <p className="text-sm text-muted-foreground">조직도 정보가 없습니다.</p>;
  }

  const showHeadOffice = lineage[0]?.parent_agent_id === null;
  const segments: { key: string; label: string; highlight?: boolean }[] = [];

  if (showHeadOffice) {
    segments.push({ key: "hq", label: "본사" });
  }

  lineage.forEach((node, index) => {
    const isCurrent = index === lineage.length - 1;
    const roleLabel = USER_ROLE_LABEL[node.role] ?? node.role;
    segments.push({
      key: node.id,
      label: `${roleLabel}(${node.name})${isCurrent ? " [현재]" : ""}`,
      highlight: isCurrent,
    });
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-[#0f2d5e]" />
        <p className="text-sm font-bold text-slate-800">조직도 (라인)</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm leading-relaxed">
        {segments.map((seg, i) => (
          <span key={seg.key} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-slate-400 font-medium">➡️</span>}
            <span
              className={
                seg.highlight
                  ? "font-bold text-[#0f2d5e] bg-blue-50 px-2 py-0.5 rounded-lg"
                  : seg.key === "hq"
                    ? "font-semibold text-slate-600"
                    : "text-slate-700"
              }
            >
              {seg.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface AdminUsersSectionProps {
  users: AdminUserListItem[];
  viewerRole: UserRole;
  viewerId: string;
}

export default function AdminUsersSection({
  users: initialUsers,
  viewerRole,
  viewerId,
}: AdminUsersSectionProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleRoleUpdated = (userId: string, role: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u)),
    );
    setSelected((prev) => (prev?.id === userId ? { ...prev, role } : prev));
  };

  const openDetail = (user: AdminUserListItem) => {
    setSelected(user);
    setOpen(true);
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm">등록된 사용자가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-50">
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => openDetail(u)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-semibold text-slate-800 text-sm">{u.name}</span>
                {!u.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded shrink-0">
                    비활성
                  </span>
                )}
                <span className="text-xs text-slate-500 leading-none">{getRecruiterTag(u)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <RoleEditor
                  user={u}
                  viewerRole={viewerRole}
                  viewerId={viewerId}
                  onUpdated={handleRoleUpdated}
                />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="text-left pb-2">
                <SheetTitle className="flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-[#0f2d5e]" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription>사용자 상세 정보 및 조직도</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 px-1">
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-slate-500 shrink-0">권한</span>
                    <RoleEditor
                      user={selected}
                      viewerRole={viewerRole}
                      viewerId={viewerId}
                      onUpdated={handleRoleUpdated}
                    />
                  </div>
                  <InfoRow label="상태" value={selected.is_active ? "활성" : "비활성"} />
                  <InfoRow
                    label="직속 유치자"
                    value={
                      !selected.parent_name || selected.parent_role === "관리자"
                        ? "본사 직속"
                        : `${selected.parent_name}${selected.parent_role ? ` (${USER_ROLE_LABEL[selected.parent_role] ?? selected.parent_role})` : ""}`
                    }
                  />
                </div>

                <LineageFlow user={selected} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}
