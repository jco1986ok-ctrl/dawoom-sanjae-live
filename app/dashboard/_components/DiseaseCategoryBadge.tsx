import { cn } from "@/lib/utils";
import {
  DISEASE_CATEGORY_BADGE_CLASS,
  type DiseaseCategory,
} from "@/lib/disease-category";

export default function DiseaseCategoryBadge({
  category,
  className,
  compact = false,
}: {
  category: DiseaseCategory | null;
  className?: string;
  compact?: boolean;
}) {
  if (!category) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border rounded-full whitespace-nowrap break-keep",
        compact ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5",
        DISEASE_CATEGORY_BADGE_CLASS[category],
        className,
      )}
    >
      {category}
    </span>
  );
}
