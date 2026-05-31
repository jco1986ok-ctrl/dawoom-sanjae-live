import type { LeadStatus } from "@/lib/types";

const STATUS_STYLE: Record<LeadStatus, string> = {
  신규: "bg-blue-100 text-blue-700",
  연락대기: "bg-yellow-100 text-yellow-700",
  상담중: "bg-purple-100 text-purple-700",
  계약완료: "bg-green-100 text-green-700",
  보류: "bg-gray-100 text-gray-600",
  종결: "bg-red-100 text-red-600",
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}
