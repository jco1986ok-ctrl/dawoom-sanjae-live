import {
  NATURAL_INFLOW,
  isNaturalInflow,
} from "@/lib/capture-referrer";

export function ReferrerBadge({ referrer }: { referrer: string }) {
  const natural = isNaturalInflow(referrer);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full leading-tight whitespace-nowrap ${
        natural
          ? "bg-slate-100 text-slate-500 border border-slate-200"
          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
      }`}
    >
      <span aria-hidden>{natural ? "🌐" : "🤝"}</span>
      {referrer}
    </span>
  );
}

export function ReferrerBadgeFromLead({
  referrer,
  partnerName,
}: {
  referrer?: string | null;
  partnerName?: string | null;
}) {
  const label =
    referrer?.trim() ||
    partnerName?.trim() ||
    NATURAL_INFLOW;

  return <ReferrerBadge referrer={label} />;
}
