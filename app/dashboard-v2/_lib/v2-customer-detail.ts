import type { LeadDetail } from "@/lib/lead-detail";
import {
  buildCustomerDetailRow,
  type CustomerDetailRow,
} from "@/app/dashboard/_components/CustomerDetailModal";
import { normalizeOwnerRole } from "@/lib/collaboration-workflow";

export type V2CustomerDetailRow = CustomerDetailRow & {
  currentOwnerRole: ReturnType<typeof normalizeOwnerRole>;
};

export function buildV2CustomerDetailRow(lead: LeadDetail): V2CustomerDetailRow {
  return {
    ...buildCustomerDetailRow(lead),
    currentOwnerRole: normalizeOwnerRole(lead.current_owner_role),
  };
}
