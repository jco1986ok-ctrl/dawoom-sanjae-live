import { getLeadStatusBadgeClass } from "@/lib/lead-status";

export default function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap break-keep shrink-0 ${getLeadStatusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
}
