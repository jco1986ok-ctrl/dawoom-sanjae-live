"use client";

import { Crown, UserCircle2, Users } from "lucide-react";

import PartnerOrgUnifiedTree from "./PartnerOrgUnifiedTree";

import type { ReferralTreeScopeMode } from "@/lib/dashboard-rbac";
import type { ParentPartnerOption } from "@/lib/partner-lineage";
import type { ReferralTreeForest, ReferralTreeNode } from "@/lib/build-referral-tree";
import type { AdminUserListItem } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";

interface Props {
  referralTreeRoots: ReferralTreeNode[];
  referralTreeForest?: ReferralTreeForest;
  enrichedUsers: AdminUserListItem[];
  viewerRole: UserRole;
  viewerId: string;
  treeScope?: ReferralTreeScopeMode;
  /** @deprecated treeScope 사용 */
  fullTreeView?: boolean;
  readOnlyRoles?: boolean;
  canChangePartnerLineage?: boolean;
  canDeleteUsers?: boolean;
  parentPartnerOptions?: ParentPartnerOption[];
  /** 파트너 목록 헤더 우측 (관리자 초대 버튼 등) */
  headerAction?: React.ReactNode;
}

function TrackSectionHeader({
  icon,
  title,
  description,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 md:px-5 py-3.5 border-b border-slate-100 ${accentClass}`}
    >
      <div className="w-9 h-9 rounded-xl bg-white/80 border border-white shadow-sm flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight break-keep">
          {title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 break-keep leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/** 실적 · 파트너 계보 · 권한 — 마스터·총괄 투트랙 조직도 */
export function PartnerNetworkSections({
  referralTreeRoots,
  referralTreeForest,
  enrichedUsers,
  viewerRole,
  viewerId,
  treeScope,
  fullTreeView = true,
  readOnlyRoles = false,
  canChangePartnerLineage = false,
  canDeleteUsers = false,
  parentPartnerOptions = [],
  headerAction,
}: Props) {
  const effectiveTreeScope: ReferralTreeScopeMode =
    treeScope ?? (fullTreeView ? "full" : "subtree");

  const showDualTrack =
    effectiveTreeScope === "full" &&
    referralTreeForest &&
    (referralTreeForest.masterTrackRoots.length > 0 ||
      referralTreeForest.headPartnerTrackRoots.length > 0);

  const treeProps = {
    users: enrichedUsers,
    viewerRole,
    viewerId,
    treeScope: effectiveTreeScope,
    fullTreeView,
    readOnlyRoles,
    canChangePartnerLineage,
    canDeleteUsers,
    parentPartnerOptions,
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {headerAction}

      {showDualTrack ? (
        <div className="flex flex-col gap-4 min-w-0">
          {referralTreeForest!.masterTrackRoots.length > 0 && (
            <div className="bg-white md:rounded-2xl rounded-none shadow-sm border border-amber-200/80 md:border overflow-hidden min-w-0 border-x-0 md:border-x">
              <TrackSectionHeader
                icon={<Crown className="w-4 h-4 text-amber-700" />}
                title="👑 마스터 트랙 · 본사 직속"
                description="정찬옥 마스터가 직접 초대·관리하는 파트너 라인입니다."
                accentClass="bg-gradient-to-r from-amber-50 to-orange-50/40"
              />
              <PartnerOrgUnifiedTree
                {...treeProps}
                referralRoots={referralTreeForest!.masterTrackRoots}
                trackLabel="마스터"
              />
            </div>
          )}

          {referralTreeForest!.headPartnerTrackRoots.length > 0 && (
            <div className="bg-white md:rounded-2xl rounded-none shadow-sm border border-violet-200/80 md:border overflow-hidden min-w-0 border-x-0 md:border-x">
              <TrackSectionHeader
                icon={<Users className="w-4 h-4 text-violet-700" />}
                title="🤝 총괄파트너 트랙"
                description="총괄파트너별 독립 네트워크 · 공식·제휴 파트너 산하 실적"
                accentClass="bg-gradient-to-r from-violet-50 to-indigo-50/40"
              />
              <PartnerOrgUnifiedTree
                {...treeProps}
                referralRoots={referralTreeForest!.headPartnerTrackRoots}
                trackLabel="총괄"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white md:rounded-2xl rounded-none shadow-sm border border-slate-200/80 md:border overflow-hidden min-w-0 border-x-0 md:border-x">
          <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 border-b border-slate-100 bg-white min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-4 h-4 text-violet-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900 text-base tracking-tight break-keep">
                파트너 조직 · 실적 · 권한
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5 break-keep">
                추천인(초대인) 기준 계보 · 산하 실적 · 권한을 한 화면에서 관리합니다
              </p>
            </div>
            {!readOnlyRoles && (
              <span className="hidden sm:inline text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                LIVE 편집
              </span>
            )}
          </div>

          <PartnerOrgUnifiedTree {...treeProps} referralRoots={referralTreeRoots} />
        </div>
      )}
    </div>
  );
}
