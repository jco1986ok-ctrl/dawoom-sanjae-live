"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Inbox, Settings2, Users } from "lucide-react";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";
import { MOBILE_CARD_CLASS } from "./dashboard-list-layout";
import { UserRoleSelectInline } from "./UserRoleSelectInline";
import {
  DeleteOrgMemberButton,
  DELETE_BLOCKED_HAS_DOWNLINE,
  DELETE_BLOCKED_OFFICIAL_HAS_NETWORK,
} from "./DeleteOrgMemberButton";
import ChangePartnerLineageModal from "./ChangePartnerLineageModal";
import type { AffiliatePartnerRow } from "./PartnerAccordionTable";
import type { ParentPartnerOption } from "@/lib/partner-lineage";
import type { ReferralTreeScopeMode } from "@/lib/dashboard-rbac";
import {
  countReferralTreeByRole,
  countReferralTreeNodes,
  isAffiliatePartnerRole,
  isMasterAdminRole,
  isOfficialPartnerRole,
  partnerRoleBadgeLabel,
  scopeReferralTreeToRoot,
  type ReferralTreeNode,
} from "@/lib/build-referral-tree";

interface Props {
  referralRoots: ReferralTreeNode[];
  users: AdminUserListItem[];
  viewerRole: UserRole;
  viewerId: string;
  /** full=전사, subtree=하위 라인, self=본인만 */
  treeScope?: ReferralTreeScopeMode;
  /** @deprecated treeScope 사용 */
  fullTreeView?: boolean;
  readOnlyRoles?: boolean;
  canChangePartnerLineage?: boolean;
  canDeleteUsers?: boolean;
  parentPartnerOptions?: ParentPartnerOption[];
  /** 투트랙 섹션 라벨 (요약 위젯용) */
  trackLabel?: string;
}

function PartnerRoleBadge({ role }: { role: string }) {
  const master = isMasterAdminRole(role);
  const official = isOfficialPartnerRole(role);
  const affiliate = isAffiliatePartnerRole(role);
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
        master
          ? "bg-amber-100 text-amber-900 border-amber-300"
          : official
            ? "bg-orange-100 text-orange-800 border-orange-200"
            : affiliate
              ? "bg-blue-50 text-blue-600 border-blue-100"
              : "bg-violet-50 text-violet-700 border-violet-100"
      }`}
    >
      {partnerRoleBadgeLabel(role)}
    </span>
  );
}

function LeadsStat({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0f2d5e] tabular-nums whitespace-nowrap">
      📈 {count}건
    </span>
  );
}

function RecruiterHint({ parentName }: { parentName: string | null }) {
  if (!parentName) return null;
  return (
    <p className="text-[11px] text-slate-500 mt-1 break-keep">
      <span className="font-semibold text-slate-400">초대인:</span>{" "}
      <span className="text-slate-600">{parentName}</span>
    </p>
  );
}

function nodeCardClasses(role: string): string {
  if (isMasterAdminRole(role)) {
    return "bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300 shadow-sm ring-1 ring-amber-200/80";
  }
  if (isOfficialPartnerRole(role)) {
    return "bg-white border-orange-200 shadow-sm ring-1 ring-orange-100/80";
  }
  if (isAffiliatePartnerRole(role)) {
    return "bg-gray-50/90 border-gray-200 border-dashed";
  }
  return "bg-violet-50/50 border-violet-200";
}

function nodeAvatarClasses(role: string): string {
  if (isMasterAdminRole(role)) {
    return "bg-amber-100 border-amber-400 text-amber-900 font-black";
  }
  if (isOfficialPartnerRole(role)) {
    return "bg-orange-100 border-orange-300 text-orange-800 font-black";
  }
  if (isAffiliatePartnerRole(role)) {
    return "bg-blue-50 border-blue-200/70 text-blue-600 font-semibold";
  }
  return "bg-violet-100 border-violet-200 text-violet-700 font-bold";
}

function toAffiliateRow(node: ReferralTreeNode): AffiliatePartnerRow {
  return {
    id: node.id,
    name: node.name,
    agentCode: node.agentCode,
    leadsCount: node.ownLeadsCount,
    contractsCount: node.ownContractsCount,
    joinedAt: node.joinedAt,
    status: node.status,
    parentAgentId: node.parentAgentId,
    parentName: node.parentName ?? "—",
    lineagePath: node.parentName ? `${node.parentName} > 본인` : "본인",
    lineageDepth: node.referralDepth,
  };
}

export default function PartnerOrgUnifiedTree({
  referralRoots: initialRoots,
  users: initialUsers,
  viewerRole,
  viewerId,
  treeScope,
  fullTreeView = true,
  readOnlyRoles = false,
  canChangePartnerLineage = false,
  canDeleteUsers = false,
  parentPartnerOptions = [],
  trackLabel,
}: Props) {
  const router = useRouter();
  const [roots, setRoots] = useState(initialRoots);
  const [users, setUsers] = useState(initialUsers);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [lineageTarget, setLineageTarget] = useState<AffiliatePartnerRow | null>(null);
  const [lineageModalOpen, setLineageModalOpen] = useState(false);

  useEffect(() => {
    setRoots(initialRoots);
  }, [initialRoots]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const effectiveTreeScope: ReferralTreeScopeMode =
    treeScope ?? (fullTreeView ? "full" : "subtree");

  const displayRoots = useMemo(() => {
    if (effectiveTreeScope === "full") return roots;
    const scoped = scopeReferralTreeToRoot(roots, viewerId);
    if (effectiveTreeScope === "self" && scoped[0]) {
      const self = scoped[0];
      return [
        {
          ...self,
          children: [],
          subtreeLeadsCount: self.ownLeadsCount,
          subtreeContractsCount: self.ownContractsCount,
        },
      ];
    }
    return scoped;
  }, [roots, effectiveTreeScope, viewerId]);

  useEffect(() => {
    if (displayRoots.length > 0) {
      setExpandedIds(new Set(displayRoots.map((r) => r.id)));
    }
  }, [displayRoots]);

  const usersById = useMemo(() => {
    const map = new Map<string, AdminUserListItem>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const { master, official, affiliate } = useMemo(
    () => countReferralTreeByRole(displayRoots),
    [displayRoots],
  );
  const totalNodes = useMemo(() => countReferralTreeNodes(displayRoots), [displayRoots]);
  const totalLeads = useMemo(
    () => displayRoots.reduce((s, r) => s + r.subtreeLeadsCount, 0),
    [displayRoots],
  );

  const handleRoleUpdated = (userId: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLineageSaved = (
    _affiliateId: string,
    _newParentId: string,
    _newParentName: string,
  ) => {
    router.refresh();
  };

  const handleMemberDeleted = () => {
    router.refresh();
  };

  if (displayRoots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 px-4 text-center">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm font-medium text-slate-600">
          {effectiveTreeScope === "full"
            ? "표시할 조직 계보가 없습니다."
            : effectiveTreeScope === "self"
              ? "표시할 본인 조직 정보가 없습니다."
              : "본인 하위 계보가 없습니다."}
        </p>
        {effectiveTreeScope === "subtree" && (
          <p className="text-xs text-slate-400 max-w-sm">
            직접 초대한 파트너가 있으면 이곳에 추천인 기준 트리로 표시됩니다.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="px-4 md:px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2">
        {trackLabel && (
          <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
            {trackLabel} 트랙
          </span>
        )}
        {master > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>
              마스터 <strong className="text-amber-800 font-bold">{master}</strong>명
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="w-4 h-4 text-orange-600 shrink-0" />
          <span>
            공식·총괄 <strong className="text-slate-900 font-bold">{official}</strong>명
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            제휴 <strong className="text-slate-900 font-bold">{affiliate}</strong>명
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            {effectiveTreeScope === "full" ? "전사" : effectiveTreeScope === "self" ? "본인" : "내 라인"}{" "}
            합산 접수{" "}
            <strong className="text-blue-600 font-bold">{totalLeads}</strong>건 ·{" "}
            <strong className="text-slate-700">{totalNodes}</strong>명
          </span>
        </div>
        {effectiveTreeScope === "subtree" && (
          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full border border-violet-100">
            내 계보 Root
          </span>
        )}
      </div>

      {/* 모바일: 추천인 트리 */}
      <div className="md:hidden px-4 py-4 space-y-2 bg-[#F9FAFB]">
        {displayRoots.map((node) => (
          <ReferralMobileBranch
            key={node.id}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            onToggle={toggleRow}
            usersById={usersById}
            viewerRole={viewerRole}
            viewerId={viewerId}
            readOnlyRoles={readOnlyRoles}
            canChangePartnerLineage={canChangePartnerLineage}
            canDeleteUsers={canDeleteUsers}
            onRoleUpdated={handleRoleUpdated}
            onMemberDeleted={handleMemberDeleted}
            onLineageChange={(n) => {
              setLineageTarget(toAffiliateRow(n));
              setLineageModalOpen(true);
            }}
          />
        ))}
      </div>

      {/* PC: 추천인 트리 테이블 */}
      <div className="hidden md:block w-full min-w-0 max-w-full overflow-x-auto">
        <table className="w-full max-w-full text-sm">
          <thead>
            <tr className="bg-white border-b border-slate-200">
              <th className="text-left py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                이름 · 초대 계보
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                라인 합산 접수
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                ⚙️ 권한
              </th>
              <th className="text-right py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRoots.map((node) => (
              <ReferralTableBranch
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleRow}
                usersById={usersById}
                viewerRole={viewerRole}
                viewerId={viewerId}
                readOnlyRoles={readOnlyRoles}
                canChangePartnerLineage={canChangePartnerLineage}
                canDeleteUsers={canDeleteUsers}
                onRoleUpdated={handleRoleUpdated}
                onMemberDeleted={handleMemberDeleted}
                onLineageChange={(n) => {
                  setLineageTarget(toAffiliateRow(n));
                  setLineageModalOpen(true);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ChangePartnerLineageModal
        affiliate={lineageTarget}
        open={lineageModalOpen}
        parentOptions={parentPartnerOptions}
        onClose={() => {
          setLineageModalOpen(false);
          setLineageTarget(null);
        }}
        onSaved={handleLineageSaved}
      />
    </div>
  );
}

type BranchProps = {
  node: ReferralTreeNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  usersById: Map<string, AdminUserListItem>;
  viewerRole: UserRole;
  viewerId: string;
  readOnlyRoles: boolean;
  canChangePartnerLineage: boolean;
  canDeleteUsers: boolean;
  onRoleUpdated: (userId: string, role: UserRole) => void;
  onMemberDeleted: () => void;
  onLineageChange: (node: ReferralTreeNode) => void;
};

function ReferralMobileBranch({
  node,
  depth,
  expandedIds,
  onToggle,
  usersById,
  viewerRole,
  viewerId,
  readOnlyRoles,
  canChangePartnerLineage,
  canDeleteUsers,
  onRoleUpdated,
  onMemberDeleted,
  onLineageChange,
}: BranchProps) {
  const isOpen = expandedIds.has(node.id);
  const user = usersById.get(node.id);
  const childCount = node.children.length;
  const official = isOfficialPartnerRole(node.role);
  const master = isMasterAdminRole(node.role);

  return (
    <div className="min-w-0" style={{ marginLeft: depth > 0 ? `${Math.min(depth, 6) * 0.75}rem` : 0 }}>
      {depth > 0 && (
        <div className="flex items-center gap-1 mb-1 ml-2 text-slate-300" aria-hidden>
          <span className="w-3 border-t border-slate-300" />
          <span className="text-[10px]">↳</span>
        </div>
      )}
      <article className={`${MOBILE_CARD_CLASS} ${nodeCardClasses(node.role)} min-w-0`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className={`text-[17px] break-keep ${official || master ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                {node.name}
              </p>
              <PartnerRoleBadge role={node.role} />
            </div>
            <p className="text-[13px] text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              가입 {node.joinedAt}
            </p>
            <RecruiterHint parentName={node.parentName} />
          </div>
          <LeadsStat count={node.subtreeLeadsCount} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100/80">
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {user ? (
              isMasterAdminRole(user.role) ? (
                <PartnerRoleBadge role={user.role} />
              ) : (
                <>
                  <UserRoleSelectInline
                    user={user}
                    viewerRole={viewerRole}
                    viewerId={viewerId}
                    readOnly={readOnlyRoles}
                    onUpdated={onRoleUpdated}
                  />
                  {canDeleteUsers && (
                    <DeleteOrgMemberButton
                      user={user}
                      viewerRole={viewerRole}
                      viewerId={viewerId}
                      onDeleted={onMemberDeleted}
                      disabled={childCount > 0}
                      disabledReason={
                        official ? DELETE_BLOCKED_OFFICIAL_HAS_NETWORK : DELETE_BLOCKED_HAS_DOWNLINE
                      }
                      size="sm"
                    />
                  )}
                </>
              )
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {canChangePartnerLineage && node.role === "하위영업자" && (
              <button
                type="button"
                onClick={() => onLineageChange(node)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
              >
                <Settings2 className="w-3 h-3" />
                라인 변경
              </button>
            )}
            {childCount > 0 && (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                className={`shrink-0 text-xs font-bold px-3 py-2 rounded-lg border whitespace-nowrap ${
                  isOpen
                    ? "bg-[#0f2d5e] text-white border-[#0f2d5e]"
                    : "bg-white text-[#0f2d5e] border-slate-200"
                }`}
              >
                {isOpen ? `▲ 하위 ${childCount}명` : `▼ 하위 ${childCount}명`}
              </button>
            )}
          </div>
        </div>
      </article>

      {childCount > 0 && isOpen && (
        <div className="mt-2 space-y-2 border-l-2 border-slate-200/80 ml-3 pl-2">
          {node.children.map((child) => (
            <ReferralMobileBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              usersById={usersById}
              viewerRole={viewerRole}
              viewerId={viewerId}
              readOnlyRoles={readOnlyRoles}
              canChangePartnerLineage={canChangePartnerLineage}
              canDeleteUsers={canDeleteUsers}
              onRoleUpdated={onRoleUpdated}
              onMemberDeleted={onMemberDeleted}
              onLineageChange={onLineageChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReferralTableBranch({
  node,
  depth,
  expandedIds,
  onToggle,
  usersById,
  viewerRole,
  viewerId,
  readOnlyRoles,
  canChangePartnerLineage,
  canDeleteUsers,
  onRoleUpdated,
  onMemberDeleted,
  onLineageChange,
}: BranchProps) {
  const isOpen = expandedIds.has(node.id);
  const user = usersById.get(node.id);
  const childCount = node.children.length;
  const official = isOfficialPartnerRole(node.role);
  const master = isMasterAdminRole(node.role);
  const indent = 12 + Math.min(depth, 8) * 20;

  return (
    <>
      <tr
        className={`border-b transition-colors ${
          official ? "bg-white hover:bg-orange-50/30" : "bg-gray-50/60 hover:bg-gray-50"
        } border-slate-100`}
      >
        <td className="py-3.5 px-5" style={{ paddingLeft: `${indent}px` }}>
          <div className="flex items-center gap-3 min-w-0">
            {depth > 0 && (
              <span className="text-slate-300 text-xs shrink-0" aria-hidden>
                └
              </span>
            )}
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-sm ${nodeAvatarClasses(node.role)}`}
            >
              {node.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${official || master ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                  {node.name}
                </span>
                <PartnerRoleBadge role={node.role} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                가입 {node.joinedAt}
              </p>
              <RecruiterHint parentName={node.parentName} />
            </div>
          </div>
        </td>
        <td className="py-3.5 px-4 text-center">
          <LeadsStat count={node.subtreeLeadsCount} />
        </td>
        <td className="py-3.5 px-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {user ? (
              isMasterAdminRole(user.role) ? (
                <PartnerRoleBadge role={user.role} />
              ) : (
                <>
                  <UserRoleSelectInline
                    user={user}
                    viewerRole={viewerRole}
                    viewerId={viewerId}
                    readOnly={readOnlyRoles}
                    onUpdated={onRoleUpdated}
                    className="mx-auto"
                  />
                  {canDeleteUsers && (
                    <DeleteOrgMemberButton
                      user={user}
                      viewerRole={viewerRole}
                      viewerId={viewerId}
                      onDeleted={onMemberDeleted}
                      disabled={childCount > 0}
                      disabledReason={
                        official ? DELETE_BLOCKED_OFFICIAL_HAS_NETWORK : DELETE_BLOCKED_HAS_DOWNLINE
                      }
                      size="sm"
                    />
                  )}
                </>
              )
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {canChangePartnerLineage && node.role === "하위영업자" && (
              <button
                type="button"
                onClick={() => onLineageChange(node)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <Settings2 className="w-3 h-3" />
                라인 변경
              </button>
            )}
            {childCount > 0 ? (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                className={`shrink-0 text-xs font-bold px-3 py-2 rounded-lg border whitespace-nowrap ${
                  isOpen
                    ? "bg-[#0f2d5e] text-white border-[#0f2d5e]"
                    : "bg-white text-[#0f2d5e] border-slate-200 hover:bg-slate-50"
                }`}
              >
                {isOpen ? `▲ ${childCount}명` : `▼ ${childCount}명`}
              </button>
            ) : (
              <span className="text-xs text-slate-400">말단</span>
            )}
          </div>
        </td>
      </tr>
      {childCount > 0 &&
        isOpen &&
        node.children.map((child) => (
          <ReferralTableBranch
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
            usersById={usersById}
            viewerRole={viewerRole}
            viewerId={viewerId}
            readOnlyRoles={readOnlyRoles}
            canChangePartnerLineage={canChangePartnerLineage}
            canDeleteUsers={canDeleteUsers}
            onRoleUpdated={onRoleUpdated}
            onMemberDeleted={onMemberDeleted}
            onLineageChange={onLineageChange}
          />
        ))}
    </>
  );
}
