import { getSiteUrl } from "@/lib/site-url";

export function buildWeimSignUrl(leadId: string): string {
  return `${getSiteUrl()}/sign/${leadId}`;
}
