"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Hash,
  Calendar,
  BarChart3,
  Inbox,
  Settings2,
} from "lucide-react";
import {
  CompactCardList,
  DesktopTableWrap,
  MobileCard,
  DESKTOP_TABLE_EL_CLASS,
  MOBILE_CARD_HEADER_CLASS,
  MOBILE_CARD_META_CLASS,
  MOBILE_CARD_TITLE_CLASS,
  MOBILE_TOGGLE_BTN_CLASS,
} from "./dashboard-list-layout";
import ChangePartnerLineageModal from "./ChangePartnerLineageModal";
import {
  moveAffiliateInAccordionRows,
  resolveTargetRowId,
  type ParentPartnerOption,
} from "@/lib/partner-lineage";

export interface AffiliatePartnerRow {
  id: string;
  name: string;
  agentCode: string;
  leadsCount: number;
  contractsCount: number;
  joinedAt: string;
  status: "활성" | "비활성";
  parentAgentId: string | null;
  parentName: string;
  /** 유입 라인: "A 공식파트너 > B 제휴파트너 > 본인" */
  lineagePath: string;
  /** 공식파트너 직속=1, 손자=2 … */
  lineageDepth: number;
}

export interface OfficialPartnerRow {
  id: string;
  name: string;
  agentCode: string;
  leadsCount: number;
  contractsCount: number;
  joinedAt: string;
  status: "활성" | "비활성";
  affiliates: AffiliatePartnerRow[];
  /** 총괄 직속 제휴 그룹 등 가상 행 */
  isVirtual?: boolean;
  /** 공식파트너 본인 직접 실적 (롤업 합산용) */
  ownLeadsCount?: number;
  ownContractsCount?: number;
}

function StatusPill({ status }: { status: "활성" | "비활성" }) {
  const active = status === "활성";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap break-keep shrink-0 ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function RoleBadge({ isVirtual }: { isVirtual: boolean }) {
  if (isVirtual) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap break-keep shrink-0">
        총괄 직속
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap break-keep shrink-0">
      공식 파트너
    </span>
  );
}

function ConversionBar({ leads, contracts }: { leads: number; contracts: number }) {
  const rate = leads > 0 ? Math.round((contracts / leads) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-full flex-1">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0f2d5e] rounded-full transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-8 text-right">{rate}%</span>
    </div>
  );
}

interface Props {
  partners: OfficialPartnerRow[];
  canChangePartnerLineage?: boolean;
  parentPartnerOptions?: ParentPartnerOption[];
}

type SignupFilter = "all" | "joined" | "pending";

const SIGNUP_FILTERS: { id: SignupFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "joined", label: "✅ 가입 완료" },
  { id: "pending", label: "⏳ 가입 대기" },
];

function flattenAffiliateMembers(rows: OfficialPartnerRow[]): AffiliatePartnerRow[] {
  const seen = new Set<string>();
  const out: AffiliatePartnerRow[] = [];
  for (const row of rows) {
    for (const aff of row.affiliates) {
      if (seen.has(aff.id)) continue;
      seen.add(aff.id);
      out.push(aff);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function isJoinedMember(aff: AffiliatePartnerRow): boolean {
  return aff.status === "활성";
}

function SignupStatusBadge({ joined }: { joined: boolean }) {
  if (joined) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 shrink-0">
        ✅ 가입 완료
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
      ⏳ 가입 대기
    </span>
  );
}

function PartnerOrgSummaryCards({
  total,
  joined,
  pending,
}: {
  total: number;
  joined: number;
  pending: number;
}) {
  const items = [
    { label: "전체 초대", value: total },
    { label: "가입 완료", value: joined },
    { label: "가입 대기", value: pending },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 px-4 pt-4 pb-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm text-center"
        >
          <p className="text-[11px] font-medium text-gray-500 leading-tight mb-1.5 break-keep">
            {item.label}
          </p>
          <p className="text-2xl font-bold text-blue-600 tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function PartnerOrgFilterPills({
  value,
  onChange,
}: {
  value: SignupFilter;
  onChange: (next: SignupFilter) => void;
}) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto">
      {SIGNUP_FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-[0.98] ${
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function PartnerMemberMobileCard({
  member,
  canChangePartnerLineage,
  onLineageChange,
}: {
  member: AffiliatePartnerRow;
  canChangePartnerLineage: boolean;
  onLineageChange: (affiliate: AffiliatePartnerRow) => void;
}) {
  const joined = isJoinedMember(member);

  return (
    <article className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-gray-100">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-slate-900 leading-snug break-keep">
            {member.name}
          </p>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">제휴 파트너</p>
          {member.parentName && (
            <p className="text-[11px] text-slate-400 mt-1 break-keep">
              소속 · {member.parentName}
            </p>
          )}
        </div>
        <SignupStatusBadge joined={joined} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-400 pt-3 border-t border-gray-50">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
          가입 {member.joinedAt}
        </span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-slate-600 tabular-nums">
          누적 접수 {member.leadsCount}건
        </span>
      </div>

      {canChangePartnerLineage && (
        <div className="mt-3 flex justify-end">
          <LineageChangeButton onClick={() => onLineageChange(member)} />
        </div>
      )}
    </article>
  );
}

function PartnerMobileOrgPanel({
  members,
  signupFilter,
  onSignupFilterChange,
  canChangePartnerLineage,
  onLineageChange,
}: {
  members: AffiliatePartnerRow[];
  signupFilter: SignupFilter;
  onSignupFilterChange: (next: SignupFilter) => void;
  canChangePartnerLineage: boolean;
  onLineageChange: (affiliate: AffiliatePartnerRow) => void;
}) {
  const joinedCount = members.filter(isJoinedMember).length;
  const pendingCount = members.length - joinedCount;

  const filtered = useMemo(() => {
    if (signupFilter === "joined") return members.filter(isJoinedMember);
    if (signupFilter === "pending") return members.filter((m) => !isJoinedMember(m));
    return members;
  }, [members, signupFilter]);

  return (
    <div className="bg-[#F9FAFB] md:hidden pb-6">
      <PartnerOrgSummaryCards
        total={members.length}
        joined={joinedCount}
        pending={pendingCount}
      />
      <PartnerOrgFilterPills value={signupFilter} onChange={onSignupFilterChange} />

      <div className="px-4 pt-1">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Inbox className="w-10 h-10 opacity-40" />
            <p className="text-sm text-center break-keep">
              아직 초대한 하위 조직원이 없습니다.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Users className="w-10 h-10 opacity-40" />
            <p className="text-sm text-center break-keep">
              해당 상태의 조직원이 없습니다.
            </p>
          </div>
        ) : (
          filtered.map((member) => (
            <PartnerMemberMobileCard
              key={member.id}
              member={member}
              canChangePartnerLineage={canChangePartnerLineage}
              onLineageChange={onLineageChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PartnerAccordionTable({
  partners: initialPartners,
  canChangePartnerLineage = false,
  parentPartnerOptions = [],
}: Props) {
  const [rows, setRows] = useState(initialPartners);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [signupFilter, setSignupFilter] = useState<SignupFilter>("all");
  const [lineageTarget, setLineageTarget] = useState<AffiliatePartnerRow | null>(null);
  const [lineageModalOpen, setLineageModalOpen] = useState(false);

  const flatMembers = useMemo(() => flattenAffiliateMembers(rows), [rows]);

  useEffect(() => {
    setRows(initialPartners);
  }, [initialPartners]);

  const openLineageModal = (affiliate: AffiliatePartnerRow) => {
    setLineageTarget(affiliate);
    setLineageModalOpen(true);
  };

  const closeLineageModal = () => {
    setLineageModalOpen(false);
    setLineageTarget(null);
  };

  const handleLineageSaved = (
    affiliateId: string,
    newParentId: string,
    newParentName: string,
  ) => {
    setRows((prev) =>
      moveAffiliateInAccordionRows(
        prev,
        affiliateId,
        newParentId,
        newParentName,
        parentPartnerOptions,
      ),
    );
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(resolveTargetRowId(newParentId, parentPartnerOptions));
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const officialCount = rows.filter((p) => !p.isVirtual).length;
  const totalAffiliates = rows.reduce((s, p) => s + p.affiliates.length, 0);

  return (
    <div className="overflow-hidden">
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 hidden md:flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap break-keep">
          <Building2 className="w-4 h-4 text-[#0f2d5e] shrink-0" />
          <span>
            공식 파트너 <strong className="text-slate-900 font-bold">{officialCount}</strong>명
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap break-keep">
          <Users className="w-4 h-4 text-violet-600 shrink-0" />
          <span>
            제휴 파트너 <strong className="text-slate-900 font-bold">{totalAffiliates}</strong>명
          </span>
        </div>
        <span className="text-[11px] text-slate-400 ml-auto hidden lg:inline whitespace-nowrap break-keep">
          행 우측 [열기]로 소속 제휴 파트너를 확인하세요
        </span>
      </div>

      <PartnerMobileOrgPanel
        members={flatMembers}
        signupFilter={signupFilter}
        onSignupFilterChange={setSignupFilter}
        canChangePartnerLineage={canChangePartnerLineage}
        onLineageChange={openLineageModal}
      />

      {/* 중간 폭(md~lg): 카드형 아코디언 */}
      {rows.length === 0 ? (
        <div className="hidden md:flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Inbox className="w-10 h-10 opacity-40" />
          <p className="text-sm">등록된 공식 파트너가 없습니다.</p>
        </div>
      ) : (
        <>
      <CompactCardList>
        {rows.map((partner) => (
          <PartnerMobileCard
            key={partner.id}
            partner={partner}
            isOpen={expandedIds.has(partner.id)}
            onToggle={() => toggleRow(partner.id)}
            canChangePartnerLineage={canChangePartnerLineage}
            onLineageChange={openLineageModal}
          />
        ))}
      </CompactCardList>

      {/* 넓은 화면(lg+): 테이블 */}
      <DesktopTableWrap>
        <table className={`${DESKTOP_TABLE_EL_CLASS} border-collapse`}>
          <thead>
            <tr className="bg-white border-b border-slate-200">
              <th className="text-left py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                공식 파트너
              </th>
              <th className="text-left py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                파트너 코드
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                제휴
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                접수
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                계약
              </th>
              <th className="text-left py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                전환율
              </th>
              <th className="text-center py-3.5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                상태
              </th>
              <th className="text-right py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                상세
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((partner) => (
              <PartnerRowGroup
                key={partner.id}
                partner={partner}
                isOpen={expandedIds.has(partner.id)}
                onToggle={() => toggleRow(partner.id)}
                canChangePartnerLineage={canChangePartnerLineage}
                onLineageChange={openLineageModal}
              />
            ))}
          </tbody>
        </table>
      </DesktopTableWrap>
        </>
      )}

      <ChangePartnerLineageModal
        affiliate={lineageTarget}
        open={lineageModalOpen}
        parentOptions={parentPartnerOptions}
        onClose={closeLineageModal}
        onSaved={handleLineageSaved}
      />
    </div>
  );
}

function LineageChangeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-lg
        border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300
        transition-colors whitespace-nowrap break-keep shrink-0"
    >
      <Settings2 className="w-3 h-3 shrink-0" />
      ⚙️ 라인 변경
    </button>
  );
}

function PartnerMobileCard({
  partner,
  isOpen,
  onToggle,
  canChangePartnerLineage,
  onLineageChange,
}: {
  partner: OfficialPartnerRow;
  isOpen: boolean;
  onToggle: () => void;
  canChangePartnerLineage: boolean;
  onLineageChange: (affiliate: AffiliatePartnerRow) => void;
}) {
  const isVirtual = partner.isVirtual === true;
  const affiliateCount = partner.affiliates.length;

  return (
    <MobileCard>
      <div className={MOBILE_CARD_HEADER_CLASS}>
        <p className={MOBILE_CARD_TITLE_CLASS}>{partner.name}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <RoleBadge isVirtual={isVirtual} />
          {!isVirtual && <StatusPill status={partner.status} />}
        </div>
      </div>

      <p className={MOBILE_CARD_META_CLASS}>
        {isVirtual ? (
          <>총괄 직속 제휴 · 제휴 {affiliateCount}명</>
        ) : (
          <>
            가입 {partner.joinedAt} · 제휴 {affiliateCount}명 · 접수 {partner.leadsCount} · 계약{" "}
            {partner.contractsCount}
          </>
        )}
      </p>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={MOBILE_TOGGLE_BTN_CLASS}
      >
        {isOpen ? `▲ 제휴파트너 ${affiliateCount}명 닫기` : `▼ 제휴파트너 ${affiliateCount}명 보기`}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-3 pt-3 border-t border-gray-100">
            {affiliateCount === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 whitespace-nowrap break-keep">
                소속 제휴 파트너가 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {partner.affiliates.map((aff) => (
                  <li
                    key={aff.id}
                    className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5 min-w-0"
                  >
                    <div className="min-w-0 flex-1 overflow-x-auto">
                      <p className="text-sm font-semibold text-slate-800 whitespace-nowrap break-keep">
                        {aff.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap break-keep">
                        {aff.agentCode} · 가입 {aff.joinedAt} · 접수 {aff.leadsCount} · 계약{" "}
                        {aff.contractsCount}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusPill status={aff.status} />
                      {canChangePartnerLineage && (
                        <LineageChangeButton onClick={() => onLineageChange(aff)} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

function PartnerRowGroup({
  partner,
  isOpen,
  onToggle,
  canChangePartnerLineage,
  onLineageChange,
}: {
  partner: OfficialPartnerRow;
  isOpen: boolean;
  onToggle: () => void;
  canChangePartnerLineage: boolean;
  onLineageChange: (affiliate: AffiliatePartnerRow) => void;
}) {
  const isVirtual = partner.isVirtual === true;
  const subTitle = isVirtual ? "총괄 직속 제휴 파트너" : `${partner.name} 님 소속 제휴 파트너`;

  return (
    <>
      <tr
        className={`border-b transition-colors duration-200 ${
          isOpen
            ? "bg-[#0f2d5e]/[0.03] border-slate-200"
            : "bg-white border-slate-100 hover:bg-slate-50/80"
        } ${isVirtual ? "bg-violet-50/30" : ""}`}
      >
        <td className="py-4 px-5 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isVirtual
                  ? "bg-violet-100 border-violet-200"
                  : "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200/60"
              }`}
            >
              <span
                className={`text-sm font-black ${
                  isVirtual ? "text-violet-700" : "text-orange-700"
                }`}
              >
                {isVirtual ? "직" : partner.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate break-keep">{partner.name}</p>
            </div>
          </div>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          {!isVirtual && (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <Hash className="w-3 h-3 text-slate-400 shrink-0" />
              {partner.agentCode}
            </span>
          )}
        </td>
        <td className="py-4 px-4 text-center whitespace-nowrap">
          <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100">
            {partner.affiliates.length}
          </span>
        </td>
        <td className="py-4 px-4 text-center whitespace-nowrap">
          <span className="font-semibold text-slate-800 tabular-nums">{partner.leadsCount}</span>
        </td>
        <td className="py-4 px-4 text-center whitespace-nowrap">
          <span className="font-semibold text-emerald-700 tabular-nums">{partner.contractsCount}</span>
        </td>
        <td className="py-4 px-4 whitespace-nowrap">
          <ConversionBar leads={partner.leadsCount} contracts={partner.contractsCount} />
        </td>
        <td className="py-4 px-4 text-center whitespace-nowrap">
          {!isVirtual && <StatusPill status={partner.status} />}
        </td>
        <td className="py-4 px-5 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={`subtable-${partner.id}`}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap ${
              isOpen
                ? "bg-[#0f2d5e] text-white border-[#0f2d5e] shadow-sm"
                : "bg-white text-[#0f2d5e] border-slate-200 hover:border-[#0f2d5e]/40 hover:bg-slate-50"
            }`}
          >
            {isOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                닫기
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                열기
              </>
            )}
          </button>
        </td>
      </tr>

      <tr className="border-b border-slate-200">
        <td colSpan={8} className="p-0 bg-transparent">
          <div
            id={`subtable-${partner.id}`}
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="bg-slate-100/90 border-t border-slate-200/80 px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap break-keep">
                    {subTitle}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    ({partner.affiliates.length}명)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 overflow-hidden shadow-inner">
                  {partner.affiliates.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      소속 제휴 파트너가 없습니다.
                    </p>
                  ) : (
                    <table className={DESKTOP_TABLE_EL_CLASS}>
                      <thead>
                        <tr className="bg-slate-200/50 border-b border-slate-200">
                          <th className="text-left py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            제휴 파트너
                          </th>
                          <th className="text-left py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            코드
                          </th>
                          <th className="text-center py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            접수
                          </th>
                          <th className="text-center py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            계약
                          </th>
                          <th className="text-left py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                            전환율
                          </th>
                          <th className="text-left py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                            가입일
                          </th>
                          <th className="text-center py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            상태
                          </th>
                          {canChangePartnerLineage && (
                            <th className="text-right py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              라인
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {partner.affiliates.map((aff, idx) => (
                          <tr
                            key={aff.id}
                            className={`transition-colors hover:bg-white/70 ${
                              idx % 2 === 0 ? "bg-slate-50/60" : "bg-slate-100/40"
                            }`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200/60 flex items-center justify-center shrink-0">
                                  <span className="text-[11px] font-bold text-blue-700">
                                    {aff.name.charAt(0)}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-800 text-sm truncate break-keep">
                                  {aff.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono text-[11px] text-slate-500">{aff.agentCode}</span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-slate-700 font-semibold tabular-nums text-xs">
                                <BarChart3 className="w-3 h-3 text-slate-400 shrink-0" />
                                {aff.leadsCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="font-semibold text-emerald-700 tabular-nums text-xs">
                                {aff.contractsCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                              <ConversionBar leads={aff.leadsCount} contracts={aff.contractsCount} />
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {aff.joinedAt}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <StatusPill status={aff.status} />
                            </td>
                            {canChangePartnerLineage && (
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <LineageChangeButton onClick={() => onLineageChange(aff)} />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
