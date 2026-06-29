import type { CollaborationOwnerRole } from "@/lib/collaboration-workflow";
import type { AgentAccountInfo, InflowInfo } from "@/lib/lead-attribution";
import type { LeadDocsStatus } from "@/lib/lead-docs-status";
import type { UserLineageNode } from "@/lib/user-lineage";

/** 대시보드·V2 공용 리드 상세 타입 (UI 컴포넌트와 분리) */
export interface LeadDetail {
  id: string;
  customer_name: string;
  phone: string | null;
  disease_name: string | null;
  disease_category?: string | null;
  fee_amount?: number | null;
  consultation_status: string;
  created_at: string;
  last_updated_at?: string | null;
  callback_date?: string | null;
  referral_source: string | null;
  referrer?: string | null;
  notes: string | null;
  pdf_url?: string | null;
  has_weim?: boolean | null;
  docs_status?: LeadDocsStatus | null;
  other_docs?: unknown;
  referred_by_user_id?: string | null;
  /** 공식파트너(총판) 라인 소속 — RLS·라인 필터와 동기화 */
  master_agent_id?: string | null;
  partner_name?: string | null;
  partner_agent_id?: string | null;
  inflow?: InflowInfo;
  agent?: AgentAccountInfo;
  lineage?: UserLineageNode[];
  lineage_label?: string;
  parent_partner_name?: string | null;
  is_viewer_direct?: boolean;
  assigned_to?: string | null;
  assigned_attorney_name?: string | null;
  assigned_user_id?: string | null;
  /** users 조인 — 처리 담당자 표시명 */
  assigned_user_name?: string | null;
  assignment_memo?: string | null;
  is_read?: boolean | null;
  current_owner_role?: CollaborationOwnerRole | string | null;
}
