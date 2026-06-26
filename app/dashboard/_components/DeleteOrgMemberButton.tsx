"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import { canDeleteUser } from "@/lib/user-role-permissions";
import { deleteUserAction } from "../_actions/users";

const DELETE_CONFIRM =
  "🚨 [경고] 이 조직원 계정을 정말 삭제하시겠습니까?\n\n복구할 수 없으며, 해당 파트너가 유치한 접수 DB 연결이 끊어질 수 있습니다.";

interface Props {
  user: AdminUserListItem;
  viewerRole: UserRole;
  viewerId: string;
  disabled?: boolean;
  disabledReason?: string;
  onDeleted: (userId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function DeleteOrgMemberButton({
  user,
  viewerRole,
  viewerId,
  disabled = false,
  disabledReason,
  onDeleted,
  className = "",
  size = "md",
}: Props) {
  const [pending, startTransition] = useTransition();

  if (!canDeleteUser(user, viewerRole, viewerId)) return null;

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const pad = size === "sm" ? "p-1.5" : "p-2";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      if (disabledReason) toast.error(disabledReason);
      return;
    }
    if (!window.confirm(DELETE_CONFIRM)) return;

    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (result.success) {
        toast.success(result.message);
        onDeleted(user.id);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || disabled}
      title={disabled ? disabledReason : "조직원 삭제"}
      aria-label={`${user.name} 조직원 삭제`}
      className={`inline-flex items-center justify-center rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent shrink-0 ${pad} ${className}`}
    >
      {pending ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Trash2 className={iconSize} />
      )}
    </button>
  );
}

/** 제휴파트너가 직접 유치한 하위 조직원이 있는지 */
export function hasDirectRecruits(
  affiliateId: string,
  affiliates: Array<{ id: string; parentAgentId: string | null }>,
): boolean {
  return affiliates.some((a) => a.parentAgentId === affiliateId);
}

export const DELETE_BLOCKED_HAS_DOWNLINE =
  "하위 제휴 파트너가 있는 조직원은 삭제할 수 없습니다. 하위 파트너를 먼저 삭제하거나 라인을 변경해 주세요.";

export const DELETE_BLOCKED_OFFICIAL_HAS_NETWORK =
  "산하 제휴 파트너가 있는 공식 파트너는 삭제할 수 없습니다. 제휴 파트너를 먼저 처리해 주세요.";
