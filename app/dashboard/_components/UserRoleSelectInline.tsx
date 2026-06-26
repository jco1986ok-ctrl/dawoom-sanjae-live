"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import {
  canEditUserRole,
  getAssignableRoles,
  USER_ROLE_LABEL,
} from "@/lib/user-role-permissions";
import { updateUserRoleAction } from "../_actions/users";

const ROLE_STYLE: Record<string, string> = {
  총괄공식파트너: "bg-violet-50 text-violet-700",
  총판영업자: "bg-orange-50 text-orange-700",
  하위영업자: "bg-blue-50 text-blue-700",
  관리자: "bg-red-50 text-red-700",
  노무사: "bg-cyan-50 text-cyan-700",
  대표노무사: "bg-teal-50 text-teal-700",
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ROLE_STYLE[role] ?? "bg-gray-100 text-gray-600"}`}
    >
      {USER_ROLE_LABEL[role] ?? role}
    </span>
  );
}

export function UserRoleSelectInline({
  user,
  viewerRole,
  viewerId,
  onUpdated,
  readOnly = false,
  className = "",
}: {
  user: AdminUserListItem;
  viewerRole: UserRole;
  viewerId: string;
  onUpdated: (userId: string, role: UserRole) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const editable = !readOnly && canEditUserRole(user, viewerRole, viewerId);
  const options = getAssignableRoles(viewerRole);

  if (!editable) {
    return <UserRoleBadge role={user.role} />;
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
    <div className={`relative shrink-0 ${className}`} onClick={(e) => e.stopPropagation()}>
      <select
        value={user.role}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className={`text-xs font-semibold pl-2.5 pr-7 py-1.5 rounded-full border-2 border-[#0f2d5e]/20 bg-white cursor-pointer appearance-none
          focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 min-w-[7.5rem]
          ${ROLE_STYLE[user.role] ?? "text-gray-700"}
          ${pending ? "opacity-60" : ""}`}
        aria-label={`${user.name} 권한 변경`}
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
