"use client";

import V2HandoffPanel from "./V2HandoffPanel";
import type { V2CustomerDetailRow } from "../_lib/v2-customer-detail";
import type { CollaborationOwnerRole } from "@/lib/collaboration-workflow";

/** V2 전용 — 상세 모달 하단 플로팅 바통 터치 패널 */
export default function V2FloatingHandoffPanel({
  row,
  onOwnerRoleUpdated,
}: {
  row: V2CustomerDetailRow;
  onOwnerRoleUpdated: (role: CollaborationOwnerRole) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none px-4 pb-4 sm:pb-6">
      <div
        className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl px-5 py-4"
        role="region"
        aria-label="협업 바통 터치"
      >
        <V2HandoffPanel row={row} onOwnerRoleUpdated={onOwnerRoleUpdated} />
      </div>
    </div>
  );
}
