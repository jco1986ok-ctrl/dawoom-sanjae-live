import type {
  AffiliatePartnerRow,
  OfficialPartnerRow,
} from "@/app/dashboard/_components/PartnerAccordionTable";
import type { UserRole } from "@/lib/types";
import {
  collectAffiliateDescendants,
  resolveRollupTarget,
} from "@/lib/build-organization-tree";
import { recomputeOfficialRowTotals } from "@/lib/build-partner-accordion";

export type ParentPartnerOption = {
  id: string;
  name: string;
  role: "총판영업자" | "총괄공식파트너";
};

export const HEAD_DIRECT_ROW_ID = "__head-direct__";
export const ORPHAN_ROW_ID = "__orphan__";

export function parentPartnerRoleLabel(role: ParentPartnerOption["role"]): string {
  return role === "총판영업자" ? "공식 파트너" : "총괄 파트너";
}

export function resolveAffiliateSourceRowId(
  rows: OfficialPartnerRow[],
  affiliateId: string,
): string | null {
  for (const row of rows) {
    if (row.affiliates.some((a) => a.id === affiliateId)) {
      return row.id;
    }
  }
  return null;
}

export function resolveTargetRowId(
  newParentId: string,
  parentOptions: ParentPartnerOption[],
): string {
  const parent = parentOptions.find((p) => p.id === newParentId);
  if (parent?.role === "총괄공식파트너") {
    return HEAD_DIRECT_ROW_ID;
  }
  return newParentId;
}

function ensureVirtualRow(
  rows: OfficialPartnerRow[],
  rowId: string,
  name: string,
): OfficialPartnerRow[] {
  if (rows.some((r) => r.id === rowId)) return rows;
  return [
    {
      id: rowId,
      name,
      agentCode: "—",
      leadsCount: 0,
      contractsCount: 0,
      joinedAt: "—",
      status: "활성",
      isVirtual: true,
      affiliates: [],
    },
    ...rows,
  ];
}

function flattenAffiliates(rows: OfficialPartnerRow[]): AffiliatePartnerRow[] {
  return rows.flatMap((r) => r.affiliates);
}

function updateLineageAfterMove(
  affiliate: AffiliatePartnerRow,
  newParentId: string,
  newParentName: string,
  parentOptions: ParentPartnerOption[],
): AffiliatePartnerRow {
  const parent = parentOptions.find((p) => p.id === newParentId);
  const parentLabel = parent
    ? `${newParentName} ${parent.role === "총판영업자" ? "공식파트너" : "총괄파트너"}`
    : newParentName;

  return {
    ...affiliate,
    parentAgentId: newParentId,
    parentName: newParentName,
    lineagePath: `${parentLabel} > 본인`,
    lineageDepth: parent?.role === "총판영업자" ? 1 : 1,
  };
}

/** 제휴 파트너를 새 상위 파트너 밑으로 이동 (클라이언트 UI 즉시 반영) */
export function moveAffiliateInAccordionRows(
  rows: OfficialPartnerRow[],
  affiliateId: string,
  newParentId: string,
  newParentName: string,
  parentOptions: ParentPartnerOption[],
): OfficialPartnerRow[] {
  const fromRowId = resolveAffiliateSourceRowId(rows, affiliateId);
  if (!fromRowId) return rows;

  const allAffiliates = flattenAffiliates(rows);
  const descendantIds = collectAffiliateDescendants(affiliateId, allAffiliates);
  const movingIds = new Set([affiliateId, ...descendantIds]);

  const movingAffiliates = allAffiliates.filter((a) => movingIds.has(a.id));
  if (movingAffiliates.length === 0) return rows;

  const toRowId = resolveTargetRowId(newParentId, parentOptions);

  let next = rows.map((row) => {
    if (row.id !== fromRowId) return row;
    const remaining = row.affiliates.filter((a) => !movingIds.has(a.id));
    return recomputeOfficialRowTotals({ ...row, affiliates: remaining });
  });

  if (toRowId === HEAD_DIRECT_ROW_ID) {
    next = ensureVirtualRow(next, HEAD_DIRECT_ROW_ID, "총괄 직속 제휴");
  }

  const updatedMoving = movingAffiliates.map((aff) => {
    if (aff.id === affiliateId) {
      return updateLineageAfterMove(aff, newParentId, newParentName, parentOptions);
    }
    return aff;
  });

  next = next.map((row) => {
    if (row.id !== toRowId) return row;
    const merged = [...row.affiliates, ...updatedMoving].sort((a, b) => {
      if (a.lineageDepth !== b.lineageDepth) return a.lineageDepth - b.lineageDepth;
      return a.name.localeCompare(b.name, "ko");
    });
    return recomputeOfficialRowTotals({ ...row, affiliates: merged });
  });

  if (fromRowId === HEAD_DIRECT_ROW_ID) {
    const headRow = next.find((r) => r.id === HEAD_DIRECT_ROW_ID);
    if (headRow && headRow.affiliates.length === 0) {
      next = next.filter((r) => r.id !== HEAD_DIRECT_ROW_ID);
    }
  }

  return next;
}

/** 조직원 삭제 후 트리 UI 즉시 반영 */
export function removeMemberFromAccordionRows(
  rows: OfficialPartnerRow[],
  userId: string,
): OfficialPartnerRow[] {
  let next = rows
    .filter((row) => !(row.id === userId && !row.isVirtual))
    .map((row) => {
      const affiliates = row.affiliates.filter((a) => a.id !== userId);
      if (affiliates.length === row.affiliates.length) return row;
      return recomputeOfficialRowTotals({ ...row, affiliates });
    })
    .filter((row) => !(row.isVirtual && row.affiliates.length === 0));

  return next;
}

export function isValidParentRole(role: UserRole): role is ParentPartnerOption["role"] {
  return role === "총판영업자" || role === "총괄공식파트너";
}

/** @deprecated resolveRollupTarget re-export for tests */
export { resolveRollupTarget };
