import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";



/** UI·테스트용 직책 (3탭 대시보드 RBAC) */

export type DashboardTestRole =

  | "마스터"

  | "대표노무사"

  | "총괄파트너"

  | "공식파트너"

  | "제휴파트너"

  | "노무사"

  | "일반팀원";



export const DASHBOARD_TEST_ROLES: DashboardTestRole[] = [

  "마스터",

  "대표노무사",

  "총괄파트너",

  "공식파트너",

  "제휴파트너",

  "노무사",

  "일반팀원",

];



export interface DashboardPermissions {

  canChangeLeadStatus: boolean;

  canWriteConsultMemo: boolean;

  canEditPartnerRoles: boolean;

  canDeleteUsers: boolean;

  canDeleteLeads: boolean;

  canInvitePartners: boolean;

  canAssignAttorney: boolean;

  canChangePartnerLineage: boolean;

  /** 담당자 배정 · 바통 터치 · 독촉 */
  canAssignLead: boolean;

  /** 보상금·수임료 등 재무 UI */
  canViewFinancialData: boolean;

}



export function mapUserRoleToTestRole(role: UserRole): DashboardTestRole {

  if (role === "관리자") return "마스터";

  if (role === "대표노무사") return "대표노무사";

  if (role === "총괄공식파트너") return "총괄파트너";

  if (role === "총판영업자") return "공식파트너";

  if (role === "하위영업자") return "제휴파트너";

  if (role === "노무사") return "노무사";

  if (role === "일반팀원") return "일반팀원";

  return "일반팀원";

}



export function canViewFullReferralTree(role: DashboardTestRole): boolean {
  return role === "마스터" || role === "총괄파트너" || role === "대표노무사";
}

/** 직책 테스트 드롭다운 — 마스터(관리자) 계정만 */
export function canUseDashboardRoleTest(role: DashboardTestRole): boolean {
  return role === "마스터";
}

/** 파트너 조직도 표시 범위 */
export type ReferralTreeScopeMode = "full" | "subtree" | "self";

export function getReferralTreeScopeMode(testRole: DashboardTestRole): ReferralTreeScopeMode {
  if (canViewFullReferralTree(testRole)) return "full";
  if (testRole === "제휴파트너") return "self";
  if (testRole === "공식파트너") return "subtree";
  return "subtree";
}

/** 직책 테스트 시 해당 역할의 대표 계정 ID (조직도·라인 스코프용) */
export function resolveSimulatedViewerContext(
  testRole: DashboardTestRole,
  loggedInViewerId: string,
  loggedInTestRole: DashboardTestRole,
  users: AdminUserListItem[],
): {
  effectiveViewerId: string;
  effectiveViewerName: string;
  fullTreeView: boolean;
  isSimulating: boolean;
  simulationLabel: string | null;
} {
  const fullTreeView = canViewFullReferralTree(testRole);
  const loggedInUser = users.find((u) => u.id === loggedInViewerId);

  const pickUser = (role: UserRole, preferLoggedIn: boolean): AdminUserListItem | null => {
    if (preferLoggedIn && loggedInUser?.role === role) return loggedInUser;
    return users.find((u) => u.role === role && u.is_active) ?? null;
  };

  let effectiveViewerId = loggedInViewerId;
  let effectiveViewerName = loggedInUser?.name ?? "본인";

  switch (testRole) {
    case "마스터":
      break;
    case "대표노무사": {
      const u = pickUser("대표노무사", testRole === loggedInTestRole);
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      }
      break;
    }
    case "총괄파트너": {
      const u = pickUser("총괄공식파트너", testRole === loggedInTestRole);
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      }
      break;
    }
    case "공식파트너": {
      const u = pickUser("총판영업자", false);
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      }
      break;
    }
    case "제휴파트너": {
      const u = pickUser("하위영업자", false);
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      }
      break;
    }
    case "노무사": {
      const u = pickUser("노무사", testRole === loggedInTestRole && loggedInUser?.role === "노무사");
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      }
      break;
    }
    case "일반팀원": {
      const u = pickUser("일반팀원", testRole === loggedInTestRole);
      if (u) {
        effectiveViewerId = u.id;
        effectiveViewerName = u.name;
      } else {
        const fallback = users.find((x) => x.is_active && x.role === "일반팀원");
        if (fallback) {
          effectiveViewerId = fallback.id;
          effectiveViewerName = fallback.name;
        }
      }
      break;
    }
  }

  const isSimulating =
    testRole !== loggedInTestRole || effectiveViewerId !== loggedInViewerId;
  const simulationLabel = isSimulating
    ? `${TEST_ROLE_LABEL[testRole]} 시점 · ${effectiveViewerName}`
    : null;

  return {
    effectiveViewerId,
    effectiveViewerName,
    fullTreeView,
    isSimulating,
    simulationLabel,
  };
}

/** 고객 상세 모달 열람 (총괄파트너 포함 — 읽기 전용) */
export function canViewCustomerDetail(role: DashboardTestRole): boolean {
  return (
    role === "마스터" ||
    role === "총괄파트너" ||
    role === "대표노무사" ||
    role === "노무사" ||
    role === "일반팀원"
  );
}

export function canViewCustomerDetailByViewerRole(role: string): boolean {
  if (role === "관리자" || role === "대표노무사" || role === "노무사") return true;
  if (role === "총괄공식파트너" || role === "총괄파트너" || role === "총괄") return true;
  return false;
}

export function getDashboardPermissions(role: DashboardTestRole): DashboardPermissions {

  switch (role) {

    case "마스터":

      return {

        canChangeLeadStatus: true,

        canWriteConsultMemo: true,

        canEditPartnerRoles: true,

        canDeleteUsers: true,

        canDeleteLeads: true,

        canInvitePartners: true,

        canAssignAttorney: true,

        canChangePartnerLineage: true,

        canAssignLead: true,

        canViewFinancialData: true,

      };

    case "대표노무사":

      return {

        canChangeLeadStatus: true,

        canWriteConsultMemo: true,

        canEditPartnerRoles: false,

        canDeleteUsers: false,

        canDeleteLeads: false,

        canInvitePartners: false,

        canAssignAttorney: true,

        canChangePartnerLineage: false,

        canAssignLead: true,

        canViewFinancialData: true,

      };

    case "총괄파트너":

      return {

        canChangeLeadStatus: true,

        canWriteConsultMemo: true,

        canEditPartnerRoles: true,

        canDeleteUsers: true,

        canDeleteLeads: true,

        canInvitePartners: true,

        canAssignAttorney: false,

        canChangePartnerLineage: true,

        canAssignLead: true,

        canViewFinancialData: true,

      };

    case "공식파트너":

    case "제휴파트너":

      return {

        canChangeLeadStatus: false,

        canWriteConsultMemo: false,

        canEditPartnerRoles: false,

        canDeleteUsers: false,

        canDeleteLeads: false,

        canInvitePartners: false,

        canAssignAttorney: false,

        canChangePartnerLineage: false,

        canAssignLead: false,

        canViewFinancialData: false,

      };

    case "노무사":

      return {

        canChangeLeadStatus: true,

        canWriteConsultMemo: true,

        canEditPartnerRoles: false,

        canDeleteUsers: false,

        canDeleteLeads: false,

        canInvitePartners: false,

        canAssignAttorney: false,

        canChangePartnerLineage: false,

        canAssignLead: true,

        canViewFinancialData: true,

      };

    case "일반팀원":

      return {

        canChangeLeadStatus: false,

        canWriteConsultMemo: false,

        canEditPartnerRoles: false,

        canDeleteUsers: false,

        canDeleteLeads: false,

        canInvitePartners: false,

        canAssignAttorney: false,

        canChangePartnerLineage: false,

        canAssignLead: true,

        canViewFinancialData: false,

      };

  }

}



/** AdminLeadsSection / LeadDetailPanel 용 */

export function testRoleToViewerRole(role: DashboardTestRole): UserRole {

  if (role === "마스터") return "관리자";

  if (role === "대표노무사") return "대표노무사";

  if (role === "총괄파트너") return "총괄공식파트너";

  if (role === "공식파트너") return "총판영업자";

  if (role === "제휴파트너") return "하위영업자";

  if (role === "노무사") return "노무사";

  if (role === "일반팀원") return "일반팀원";

  return "노무사";

}



/** LeadDetailPanel canEdit 매핑 */

export function testRoleToPanelRole(role: DashboardTestRole): string {

  if (role === "마스터") return "관리자";

  if (role === "대표노무사") return "대표노무사";

  if (role === "노무사" || role === "일반팀원") return "노무사";

  return "파트너";

}



export const TEST_ROLE_LABEL: Record<DashboardTestRole, string> = {

  마스터: "👑 마스터",

  대표노무사: "👨‍⚖️ 대표노무사",

  총괄파트너: "🤝 총괄파트너",

  공식파트너: "🏢 공식파트너",

  제휴파트너: "🤝 제휴파트너",

  노무사: "👨‍💼 노무사",

  일반팀원: "📋 일반팀원",

};


