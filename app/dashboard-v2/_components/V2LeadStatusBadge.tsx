"use client";

import { getV2LeadStatusBadgeClass, getV2LeadStatusLabel } from "@/lib/v2-lead-status";

export default function V2LeadStatusBadge({ status }: { status: string }) {
  const label = getV2LeadStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap break-keep shrink-0 max-w-full truncate ${getV2LeadStatusBadgeClass(status)}`}
      title={label}
    >
      {label}
    </span>
  );
}
