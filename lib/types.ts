export type UserRole =
  | "총괄공식파트너"
  | "총판영업자"
  | "하위영업자"
  | "관리자"
  | "노무사"
  | "대표노무사"
  | "일반팀원";

import type { LeadStatusOption } from "@/lib/lead-status";

export type LeadStatus =
  | LeadStatusOption
  | "연락대기"
  | "종결";

/** 코드 상수 PENDING → DB·UI 표시값 '보류' */
export { LEAD_STATUS_CODE, LEAD_STATUS_PENDING } from "@/lib/lead-status";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  agent_id: string;
  phone: string | null;
  is_active: boolean;
  parent_agent_id: string | null; // 하위영업자 전용: 총판영업자 id
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  disease_name: string;
  disease_category?: string | null;
  fee_amount?: number | null;
  consultation_status: LeadStatus;
  referral_source: string | null;
  referrer: string | null;
  referred_by_user_id: string | null; // 실제 접수 영업자 (총판 or 하위)
  master_agent_id: string | null;     // 총판영업자 id
  notes: string | null;
  pdf_url?: string | null;
  has_weim?: boolean | null;
  docs_status?: import("@/lib/lead-docs-status").LeadDocsStatus | null;
  other_docs?: unknown;
  created_at: string;
  updated_at: string;
  /** 조인 시 포함 */
  referred_by?: Pick<AppUser, "id" | "name" | "agent_id"> | null;
  master_agent?: Pick<AppUser, "id" | "name" | "agent_id"> | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  created_at: string;
}
