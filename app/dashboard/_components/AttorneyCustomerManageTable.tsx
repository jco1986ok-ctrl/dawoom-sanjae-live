"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import {
  MessageSquarePlus,
  Phone,
  Stethoscope,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import { LeadStatusSelect } from "./LeadStatusSelect";
import LeadStatusBadge from "./LeadStatusBadge";
import {
  CustomerDetailModal,
  applyDocsPatchToDetailRow,
  applyOtherDocsPatchToDetailRow,
  buildCustomerDetailRow,
  notesToComments,
  type CustomerDetailRow,
} from "./CustomerDetailModal";
import {
  CUSTOMER_QUICK_FILTERS,
  CUSTOMER_TABLE_PAGE_SIZE,
  matchesCustomerQuickFilter,
  type CustomerQuickFilterId,
} from "@/lib/lead-status";
import {
  DISEASE_CATEGORY_FILTERS,
  matchesDiseaseCategoryFilter,
  type DiseaseCategoryFilterId,
} from "@/lib/disease-category";
import DiseaseCategoryBadge from "./DiseaseCategoryBadge";
import {
  DesktopTableWrap,
  FluidDataRow,
  FluidRowBand,
  FluidRowField,
  FluidRowList,
  MobileCard,
  MobileCardList,
  DESKTOP_TABLE_EL_CLASS,
  MOBILE_CARD_FOOTER_META_CLASS,
  MOBILE_CARD_HEADER_CLASS,
  MOBILE_CARD_INFO_BOX_CLASS,
  MOBILE_CARD_TITLE_CLASS,
} from "./dashboard-list-layout";
import { useDashboardLeads } from "@/hooks/use-dashboard-leads";
import DocumentsMatrixBadges from "./DocumentsMatrixBadges";
import { canViewDocumentsMatrix, canDownloadContractPdf } from "@/lib/lead-docs-status";
import { PartnerConfirmBadge } from "./PartnerConfirmBadge";
import { BulkDocumentsDownloadButton } from "./BulkDocumentsDownloadButton";
import { DocCollectionProgressBadge, DocumentsWithProgress } from "./DocCollectionProgressBadge";
import { deleteLead } from "../_actions/leads";

interface Props {
  leads?: LeadDetail[];
  /** 노무사 배당 건만 클라이언트에서 재조회 */
  assignedTo?: string;
  /** false면 부모에서 스코핑한 leads만 사용 */
  clientRefetch?: boolean;
  /** 서류 매트릭스 RBAC — currentUserRole (마스터/총괄/대표노무사/노무사) */
  viewerRole?: string;
  canChangeStatus?: boolean;
  canWriteMemo?: boolean;
  /** 마스터(관리자) 접수 DB 삭제 */
  canDelete?: boolean;
}

export default function AttorneyCustomerManageTable({
  leads: initialLeads = [],
  assignedTo,
  clientRefetch = true,
  viewerRole = "",
  canChangeStatus = true,
  canWriteMemo = true,
  canDelete = false,
}: Props) {
  const showDocsMatrix = canViewDocumentsMatrix(viewerRole);
  const docsInteractive = showDocsMatrix;
  const canDownloadContract = canDownloadContractPdf(viewerRole);
  const { customers, isLoading } = useDashboardLeads({
    initialLeads,
    assignedTo,
    enrich: true,
    clientRefetch,
  });

  const [rows, setRows] = useState<CustomerDetailRow[]>(() =>
    initialLeads.map(buildCustomerDetailRow),
  );
  const [detailTarget, setDetailTarget] = useState<CustomerDetailRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<CustomerQuickFilterId>("all");
  const [diseaseFilter, setDiseaseFilter] = useState<DiseaseCategoryFilterId>("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(customers.map(buildCustomerDetailRow));
  }, [customers]);

  useEffect(() => {
    if (!detailOpen || !detailTarget) return;
    const fresh = customers.find((c) => c.id === detailTarget.id);
    if (fresh) setDetailTarget(buildCustomerDetailRow(fresh));
  }, [customers, detailOpen, detailTarget?.id]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesCustomerQuickFilter(r.consultationStatus, quickFilter) &&
          matchesDiseaseCategoryFilter(r.diseaseCategory, diseaseFilter),
      ),
    [rows, quickFilter, diseaseFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / CUSTOMER_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * CUSTOMER_TABLE_PAGE_SIZE;
    return filteredRows.slice(start, start + CUSTOMER_TABLE_PAGE_SIZE);
  }, [filteredRows, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleQuickFilter = (id: CustomerQuickFilterId) => {
    setQuickFilter(id);
    setPage(1);
  };

  const handleDiseaseFilter = (id: DiseaseCategoryFilterId) => {
    setDiseaseFilter(id);
    setPage(1);
  };

  const syncRowData = (leadId: string, patch: Partial<CustomerDetailRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === leadId ? { ...r, ...patch } : r)),
    );
    setDetailTarget((prev) =>
      prev?.id === leadId ? { ...prev, ...patch } : prev,
    );
  };

  const applyNotes = (leadId: string, notes: string, status?: string) => {
    syncRowData(leadId, {
      notes,
      comments: notesToComments(notes),
      ...(status !== undefined ? { consultationStatus: status } : {}),
    });
  };

  const updateStatus = (id: string, status: string, notes?: string) => {
    if (notes !== undefined) {
      applyNotes(id, notes, status);
    } else {
      syncRowData(id, { consultationStatus: status });
    }
  };

  const openDetail = (row: CustomerDetailRow) => {
    const latest = rows.find((r) => r.id === row.id) ?? row;
    setDetailTarget(latest);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailTarget(null);
  };

  async function handleDelete(e: React.MouseEvent, leadId: string) {
    e.stopPropagation();
    if (!window.confirm("이 접수 데이터를 정말 삭제하시겠습니까? (복구 불가)")) return;

    setDeletingId(leadId);
    startTransition(async () => {
      const result = await deleteLead(leadId);
      if (result.success) {
        setRows((prev) => prev.filter((r) => r.id !== leadId));
        if (detailTarget?.id === leadId) closeDetail();
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
      setDeletingId(null);
    });
  }

  const hasActionColumn = canDelete || (showDocsMatrix && docsInteractive);

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#3182f6]" />
        <p className="text-sm">고객 접수 데이터를 불러오는 중…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Inbox className="w-10 h-10 opacity-40" />
        <p className="text-sm">아직 접수된 고객 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* 퀵 필터 */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_QUICK_FILTERS.map((f) => {
            const active = quickFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleQuickFilter(f.id)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all
                  ${active
                    ? "bg-[#3182f6] text-white shadow-sm shadow-blue-200/60"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          {DISEASE_CATEGORY_FILTERS.map((f) => {
            const active = diseaseFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleDiseaseFilter(f.id)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all
                  ${active
                    ? "bg-[#0f2d5e] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5">
          {filteredRows.length}건 표시
          {filteredRows.length !== rows.length && ` (전체 ${rows.length}건)`}
          {totalPages > 1 && ` · ${safePage}/${totalPages}페이지`}
          <span className="md:hidden text-slate-300 ml-1">· 카드 탭 시 상세</span>
          <span className="hidden md:inline lg:hidden text-slate-300 ml-1">· 행 탭 시 상세</span>
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Inbox className="w-10 h-10 opacity-40" />
          <p className="text-sm">선택한 필터에 해당하는 고객이 없습니다.</p>
          <button
            type="button"
            onClick={() => handleQuickFilter("all")}
            className="text-xs font-semibold text-[#3182f6] hover:underline"
          >
            전체 보기로 돌아가기
          </button>
        </div>
      ) : (
        <>
          {/* 모바일: 카드 리스트 */}
          <MobileCardList>
            {pagedRows.map((row) => (
              <MobileCard key={row.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(row);
                    }
                  }}
                  className="cursor-pointer text-left min-w-0"
                >
                  <div className={MOBILE_CARD_HEADER_CLASS}>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={MOBILE_CARD_TITLE_CLASS}>{row.customerName}</span>
                      <DiseaseCategoryBadge category={row.diseaseCategory} compact />
                    </div>
                    <LeadStatusBadge status={row.consultationStatus} />
                  </div>

                  {showDocsMatrix && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <DocumentsWithProgress
                        docsStatus={row.docsStatus}
                        docFiles={row.docFiles}
                        otherDocs={row.otherDocs}
                        progressLayout="column"
                        progressCompact
                        badges={
                          <DocumentsMatrixBadges
                            docsStatus={row.docsStatus}
                            className="min-w-0"
                            interactive={docsInteractive}
                            leadId={row.id}
                            customerName={row.customerName}
                            docFiles={row.docFiles}
                            otherDocs={row.otherDocs}
                          />
                        }
                      />
                    </div>
                  )}

                  <div className={MOBILE_CARD_INFO_BOX_CLASS}>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap break-keep shrink-0">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {row.phone}
                    </span>
                    <span className="text-gray-300 shrink-0">·</span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap break-keep">
                      <Stethoscope className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {row.diseaseName}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PartnerConfirmBadge onClick={() => openDetail(row)} />
                    <div className="flex items-center gap-1 shrink-0">
                      {docsInteractive && (
                        <BulkDocumentsDownloadButton
                          leadId={row.id}
                          customerName={row.customerName}
                          docsStatus={row.docsStatus}
                        />
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, row.id)}
                          disabled={deletingId === row.id}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                          title="접수 삭제"
                          aria-label="접수 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className={MOBILE_CARD_FOOTER_META_CLASS}>
                    접수 {row.submittedAt}
                    {row.comments.length > 0 && (
                      <span className="ml-2 text-gray-500 whitespace-nowrap break-keep">
                        · 코멘트 {row.comments.length}
                      </span>
                    )}
                  </p>
                </div>

                <div
                  className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LeadStatusSelect
                    leadId={row.id}
                    value={row.consultationStatus}
                    disabled={!canChangeStatus}
                    className="w-full"
                    onChanged={(s, notes) => updateStatus(row.id, s, notes)}
                  />
                  {canWriteMemo ? (
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-lg
                        bg-[#0f2d5e] text-white hover:bg-[#1a3d7a] transition-colors whitespace-nowrap break-keep"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                      상담 메모 작성
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-lg
                        border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap break-keep"
                    >
                      상세 보기
                    </button>
                  )}
                </div>
              </MobileCard>
            ))}
          </MobileCardList>

          {/* 중간 폭(md~lg): Flex 래핑 행 */}
          <FluidRowList>
            {pagedRows.map((row) => (
              <FluidDataRow key={row.id} onClick={() => openDetail(row)}>
                <FluidRowBand>
                  <FluidRowField className="flex-1 min-w-0 w-32">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-900 break-keep">{row.customerName}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {row.phone}
                      </span>
                    </div>
                  </FluidRowField>
                  <FluidRowField className="shrink-0 w-24">
                    <div className="flex flex-col gap-1 items-start">
                      <LeadStatusBadge status={row.consultationStatus} />
                      <DiseaseCategoryBadge category={row.diseaseCategory} compact />
                    </div>
                  </FluidRowField>
                  <FluidRowField label="유입 파트너" className="shrink-0">
                    <PartnerConfirmBadge onClick={() => openDetail(row)} />
                  </FluidRowField>
                  <FluidRowField label="날짜" className="shrink-0 w-32">
                    <span className="text-slate-500 text-xs tabular-nums">{row.submittedAt}</span>
                  </FluidRowField>
                </FluidRowBand>

                {showDocsMatrix && (
                  <FluidRowBand>
                    <FluidRowField label="취합 서류" className="w-full min-w-0 flex-1">
                      <DocumentsWithProgress
                        docsStatus={row.docsStatus}
                        docFiles={row.docFiles}
                        otherDocs={row.otherDocs}
                        progressLayout="column"
                        progressCompact
                        badges={
                          <DocumentsMatrixBadges
                            docsStatus={row.docsStatus}
                            interactive={docsInteractive}
                            leadId={row.id}
                            customerName={row.customerName}
                            docFiles={row.docFiles}
                            otherDocs={row.otherDocs}
                          />
                        }
                      />
                    </FluidRowField>
                    <FluidRowField className="shrink-0 self-start">
                      <div className="flex items-center gap-0.5">
                        {docsInteractive && (
                          <BulkDocumentsDownloadButton
                            leadId={row.id}
                            customerName={row.customerName}
                            docsStatus={row.docsStatus}
                          />
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, row.id)}
                            disabled={deletingId === row.id}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                            title="접수 삭제"
                            aria-label="접수 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </FluidRowField>
                  </FluidRowBand>
                )}

                <FluidRowBand onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-2 w-full min-w-0">
                    <LeadStatusSelect
                      leadId={row.id}
                      value={row.consultationStatus}
                      disabled={!canChangeStatus}
                      className="flex-1 min-w-[140px] max-w-full"
                      onChanged={(s, notes) => updateStatus(row.id, s, notes)}
                    />
                    {canWriteMemo ? (
                      <button
                        type="button"
                        onClick={() => openDetail(row)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg
                          bg-[#0f2d5e] text-white hover:bg-[#1a3d7a] transition-colors shrink-0"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                        상담 메모 작성
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDetail(row)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg
                          border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                      >
                        상세 보기
                      </button>
                    )}
                  </div>
                </FluidRowBand>
              </FluidDataRow>
            ))}
          </FluidRowList>

          {/* 넓은 화면(lg+): 테이블 */}
          <DesktopTableWrap>
            <table className={`${DESKTOP_TABLE_EL_CLASS} table-fixed`}>
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                {showDocsMatrix && (
                  <col style={{ width: `${hasActionColumn ? 42 : 50}%` }} />
                )}
                {showDocsMatrix && <col style={{ width: "8%" }} />}
                <col
                  style={{
                    width: showDocsMatrix
                      ? `${hasActionColumn ? 9 : 9}%`
                      : `${hasActionColumn ? 59 : 67}%`,
                  }}
                />
                {hasActionColumn && <col style={{ width: "8%" }} />}
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    고객
                  </th>
                  <th className="text-left py-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    상태
                  </th>
                  <th className="text-left py-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    유입 파트너
                  </th>
                  {showDocsMatrix && (
                    <th className="text-left py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      취합 서류
                    </th>
                  )}
                  {showDocsMatrix && (
                    <th className="text-center py-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      진행률
                    </th>
                  )}
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    날짜
                  </th>
                  {showDocsMatrix && docsInteractive && (
                    <th className="py-3 px-2 w-10" aria-label="서류 일괄 다운로드" />
                  )}
                  {canDelete && !(showDocsMatrix && docsInteractive) && (
                    <th className="py-3 px-2 w-10" aria-label="접수 삭제" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDetail(row)}
                    className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 min-w-0 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 truncate">{row.customerName}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{row.phone}</span>
                        </span>
                        <DiseaseCategoryBadge category={row.diseaseCategory} compact />
                      </div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap align-middle">
                      <LeadStatusBadge status={row.consultationStatus} />
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap align-middle">
                      <PartnerConfirmBadge onClick={() => openDetail(row)} />
                    </td>
                    {showDocsMatrix && (
                      <td className="py-3 px-3 align-middle overflow-visible">
                        <DocumentsMatrixBadges
                          docsStatus={row.docsStatus}
                          interactive={docsInteractive}
                          leadId={row.id}
                          customerName={row.customerName}
                          docFiles={row.docFiles}
                          otherDocs={row.otherDocs}
                          wrap
                          compact
                        />
                      </td>
                    )}
                    {showDocsMatrix && (
                      <td
                        className="py-3 px-2 align-middle text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DocCollectionProgressBadge
                          docsStatus={row.docsStatus}
                          docFiles={row.docFiles}
                          otherDocs={row.otherDocs}
                          layout="column"
                          align="center"
                          compact
                          className="mx-auto"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 text-slate-500 text-xs tabular-nums whitespace-nowrap align-middle">
                      {row.submittedAt}
                    </td>
                    {(canDelete || (showDocsMatrix && docsInteractive)) && (
                      <td className="py-3 px-2 text-center whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-0.5">
                          {showDocsMatrix && docsInteractive && (
                            <BulkDocumentsDownloadButton
                              leadId={row.id}
                              customerName={row.customerName}
                              docsStatus={row.docsStatus}
                            />
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, row.id)}
                              disabled={deletingId === row.id}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="접수 삭제"
                              aria-label="접수 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableWrap>

          {totalPages > 1 && (
            <CustomerTablePagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <CustomerDetailModal
        row={detailTarget}
        open={detailOpen}
        onClose={closeDetail}
        canChangeStatus={canChangeStatus}
        canWriteMemo={canWriteMemo}
        canDownloadContract={canDownloadContract}
        showDocuments={showDocsMatrix}
        viewerRole={viewerRole}
        onNotesUpdated={(id, notes) => applyNotes(id, notes)}
        onStatusUpdated={(id, status, notes) => updateStatus(id, status, notes)}
        onDocsUpdated={(id, patch) => {
          setRows((prev) =>
            prev.map((r) => (r.id === id ? applyDocsPatchToDetailRow(r, patch) : r)),
          );
          setDetailTarget((prev) =>
            prev?.id === id ? applyDocsPatchToDetailRow(prev, patch) : prev,
          );
        }}
        onOtherDocsUpdated={(id, otherDocs) => {
          setRows((prev) =>
            prev.map((r) => (r.id === id ? applyOtherDocsPatchToDetailRow(r, otherDocs) : r)),
          );
          setDetailTarget((prev) =>
            prev?.id === id ? applyOtherDocsPatchToDetailRow(prev, otherDocs) : prev,
          );
        }}
        onDiseaseCategoryUpdated={(id, category) => {
          syncRowData(id, { diseaseCategory: category });
        }}
      />
    </>
  );
}

function CustomerTablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-slate-100 bg-white">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-slate-600
          hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        이전
      </button>

      <div className="flex items-center gap-1 mx-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] h-8 px-2 rounded-full text-xs font-bold transition-colors
                ${p === page
                  ? "bg-[#3182f6] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {p}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-slate-600
          hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        다음
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
