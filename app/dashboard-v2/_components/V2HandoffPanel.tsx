"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, UserCheck } from "lucide-react";
import type { V2CustomerDetailRow } from "../_lib/v2-customer-detail";
import {
  COLLABORATION_OWNER_BADGE_CLASS,
  COLLABORATION_OWNER_LABELS,
  HANDOFF_ACTIONS,
  normalizeOwnerRole,
  type CollaborationOwnerRole,
} from "@/lib/collaboration-workflow";
import { handoffLeadOwner } from "../_actions/collaboration";
import { notifyV2NotificationsRefresh } from "./V2NotificationBell";

interface Props {
  row: V2CustomerDetailRow;
  onOwnerRoleUpdated: (role: CollaborationOwnerRole) => void;
}

export default function V2HandoffPanel({ row, onOwnerRoleUpdated }: Props) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const ownerRole = normalizeOwnerRole(row.currentOwnerRole);
  const actions = HANDOFF_ACTIONS[ownerRole];

  const handleHandoff = (actionId: string) => {
    setError("");
    startTransition(async () => {
      const result = await handoffLeadOwner(row.id, actionId);
      if (result.success && result.nextOwner) {
        onOwnerRoleUpdated(result.nextOwner);
        notifyV2NotificationsRefresh();
      } else {
        setError(result.error ?? "바통 터치에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <UserCheck className="w-4 h-4 text-[#0f2d5e]" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          현재 담당 (책임자 태그)
        </span>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${COLLABORATION_OWNER_BADGE_CLASS[ownerRole]}`}
        >
          {COLLABORATION_OWNER_LABELS[ownerRole]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isPending}
            onClick={() => handleHandoff(action.id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
              bg-[#0f2d5e] text-white hover:bg-[#0f2d5e]/90 disabled:opacity-60 transition-colors min-h-[44px]"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {action.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
