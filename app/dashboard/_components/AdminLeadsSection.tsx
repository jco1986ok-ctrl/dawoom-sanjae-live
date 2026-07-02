"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Loader2, Inbox } from "lucide-react";
import LeadStatusBadge from "./LeadStatusBadge";
import type { EnrichedLead } from "@/lib/enrich-leads";
import { LeadDetailPanel, type LeadDetail, type AttorneyOption } from "./LeadDetailPanel";
import { deleteLead } from "../_actions/leads";
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
  MOBILE_CARD_TITLE_CLASS,
} from "./dashboard-list-layout";
import { useDashboardLeads } from "@/hooks/use-dashboard-leads";
import DocumentsMatrixBadges from "./DocumentsMatrixBadges";
import { canViewDocumentsMatrix, canDownloadContractPdf, deriveLeadDocsStatus } from "@/lib/lead-docs-status";
import { deriveLeadDocFiles } from "@/lib/lead-doc-files";
import { parseOtherDocs } from "@/lib/lead-other-docs";
import { PartnerInflowCell } from "./PartnerInflowCell";
import { BulkDocumentsDownloadButton } from "./BulkDocumentsDownloadButton";
import {
  CustomerDetailModal,
  applyDocsPatchToDetailRow,
  applyOtherDocsPatchToDetailRow,
  buildCustomerDetailRow,
  notesToComments,
  type CustomerDetailRow,
} from "./CustomerDetailModal";

function resolvePanelRole(viewerRole: string): string {
  if (
    viewerRole === "관리자" ||
    viewerRole === "대표노무사" ||
    viewerRole === "노무사" ||
    viewerRole === "일반노무사"
  ) {
    return viewerRole;
  }
  return "파트너";
}

interface Props {
  leads?: (LeadDetail | EnrichedLead)[];
  canDelete?: boolean;
  viewerRole?: string;
  attorneys?: AttorneyOption[];
}

export function AdminLeadsSection({
  leads: initialLeads = [],
  canDelete = false,
  viewerRole = "관리자",
  attorneys = [],
}: Props) {
  const { customers, isLoading } = useDashboardLeads({
    initialLeads,
    enrich: true,
  });

  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [detailRow, setDetailRow] = useState<CustomerDetailRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [localLeads, setLocalLeads] = useState<(LeadDetail | EnrichedLead)[]>(initialLeads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalLeads(customers);
  }, [customers]);

  useEffect(() => {
    if (!detailOpen || !detailRow) return;
    const fresh = customers.find((c) => c.id === detailRow.id);
    if (fresh) setDetailRow(buildCustomerDetailRow(fresh));
  }, [customers, detailOpen, detailRow?.id]);

  async function handleDelete(e: React.MouseEvent, leadId: string) {
    e.stopPropagation();
    if (!window.confirm("이 접수 데이터를 정말 삭제하시겠습니까? (복구 불가)")) return;

    setDeletingId(leadId);
    startTransition(async () => {
      const result = await deleteLead(leadId);
      if (result.success) {
        setLocalLeads((prev) => prev.filter((l) => l.id !== leadId));
        if (selected?.id === leadId) setSelected(null);
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
      setDeletingId(null);
    });
  }

  function handleStatusChanged(id: string, newStatus: string) {
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, consultation_status: newStatus } : l)),
    );
    setSelected((prev) =>
      prev?.id === id ? { ...prev, consultation_status: newStatus } : prev,
    );
  }

  function handleAssigned(id: string, assignedToId: string | null, name: string | null) {
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, assigned_to: assignedToId, assigned_attorney_name: name }
          : l,
      ),
    );
    setSelected((prev) =>
      prev?.id === id
        ? { ...prev, assigned_to: assignedToId, assigned_attorney_name: name }
        : prev,
    );
  }

  const showDocsMatrix = canViewDocumentsMatrix(viewerRole);
  const docsInteractive = showDocsMatrix;
  const canDownloadContract = canDownloadContractPdf(viewerRole);

  const openLead = (lead: LeadDetail | EnrichedLead) => {
    if (docsInteractive) {
      setDetailRow(buildCustomerDetailRow(lead));
      setDetailOpen(true);
      return;
    }
    setSelected(lead);
  };

  return (
    <>
      {isLoading && localLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#3182f6]" />
          <p className="text-sm">접수 데이터를 불러오는 중…</p>
        </div>
      ) : localLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <Inbox className="w-10 h-10 opacity-40" />
          <p className="text-sm">아직 접수된 고객 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 모바일: 카드 리스트 */}
          <MobileCardList>
            {localLeads.map((lead) => (
              <MobileCard
                key={lead.id}
                role="button"
                tabIndex={0}
                onClick={() => openLead(lead)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLead(lead);
                  }
                }}
                className="cursor-pointer hover:bg-gray-50 transition-colors text-left"
              >
                <div className={MOBILE_CARD_HEADER_CLASS}>
                  <span className={MOBILE_CARD_TITLE_CLASS}>{lead.customer_name}</span>
                  <LeadStatusBadge status={lead.consultation_status} />
                </div>

                {showDocsMatrix && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <DocumentsMatrixBadges
                      docsStatus={deriveLeadDocsStatus(lead)}
                      className="min-w-0"
                      interactive={docsInteractive}
                      leadId={lead.id}
                      customerName={lead.customer_name}
                      docFiles={deriveLeadDocFiles(lead)}
                      otherDocs={parseOtherDocs(lead.other_docs)}
                    />
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <PartnerInflowCell
                    partnerName={lead.partner_name}
                    lineageLabel={lead.lineage_label}
                    inflow={lead.inflow}
                    attributionTrace={lead.attribution_trace}
                    onClick={() => openLead(lead)}
                  />
                  {docsInteractive && (
                    <BulkDocumentsDownloadButton
                      leadId={lead.id}
                      customerName={lead.customer_name}
                      docsStatus={deriveLeadDocsStatus(lead)}
                    />
                  )}
                </div>

                {lead.assigned_attorney_name && (
                  <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full whitespace-nowrap break-keep shrink-0">
                    ⚖️ {lead.assigned_attorney_name}
                  </span>
                )}

                <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
                  <p className={MOBILE_CARD_FOOTER_META_CLASS}>{lead.created_at.slice(0, 10)}</p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, lead.id)}
                      disabled={deletingId === lead.id}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                      title="접수 삭제"
                      aria-label="접수 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </MobileCard>
            ))}
          </MobileCardList>

          {/* 중간 폭(md~lg): Flex 래핑 행 */}
          <FluidRowList>
            {localLeads.map((lead) => (
              <FluidDataRow key={lead.id} onClick={() => openLead(lead)}>
                <FluidRowBand>
                  <FluidRowField className="flex-1 min-w-0 w-32">
                    <span className="font-semibold text-slate-800 break-keep">
                      {lead.customer_name}
                    </span>
                  </FluidRowField>
                  <FluidRowField className="shrink-0 w-24">
                    <LeadStatusBadge status={lead.consultation_status} />
                  </FluidRowField>
                  <FluidRowField label="유입 파트너" className="shrink-0">
                    <PartnerInflowCell
                    partnerName={lead.partner_name}
                    lineageLabel={lead.lineage_label}
                    inflow={lead.inflow}
                    attributionTrace={lead.attribution_trace}
                    onClick={() => openLead(lead)}
                  />
                  </FluidRowField>
                  <FluidRowField label="날짜" className="shrink-0 w-32">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {lead.created_at.slice(0, 10)}
                    </span>
                  </FluidRowField>
                </FluidRowBand>

                {showDocsMatrix && (
                  <FluidRowBand>
                    <FluidRowField label="취합 서류" className="w-full min-w-0 flex-1">
                      <DocumentsMatrixBadges
                        docsStatus={deriveLeadDocsStatus(lead)}
                        interactive={docsInteractive}
                        leadId={lead.id}
                        customerName={lead.customer_name}
                        docFiles={deriveLeadDocFiles(lead)}
                      otherDocs={parseOtherDocs(lead.other_docs)}
                      />
                    </FluidRowField>
                    {docsInteractive && (
                      <FluidRowField className="shrink-0 self-start">
                        <BulkDocumentsDownloadButton
                          leadId={lead.id}
                          customerName={lead.customer_name}
                          docsStatus={deriveLeadDocsStatus(lead)}
                        />
                      </FluidRowField>
                    )}
                  </FluidRowBand>
                )}

                {(lead.assigned_attorney_name || canDelete) && (
                  <FluidRowBand onClick={(e) => e.stopPropagation()}>
                    {lead.assigned_attorney_name && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        ⚖️ {lead.assigned_attorney_name}
                      </span>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, lead.id)}
                        disabled={deletingId === lead.id}
                        className="ml-auto p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                        title="접수 삭제"
                        aria-label="접수 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </FluidRowBand>
                )}
              </FluidDataRow>
            ))}
          </FluidRowList>

          {/* 넓은 화면(lg+): 테이블 */}
          <DesktopTableWrap>
            <table className={`${DESKTOP_TABLE_EL_CLASS} table-fixed`}>
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                {showDocsMatrix && <col className="w-[44%]" />}
                <col className={showDocsMatrix ? "w-[10%]" : "w-[66%]"} />
                {(canDelete || (showDocsMatrix && docsInteractive)) && <col className="w-[4%]" />}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    고객
                  </th>
                  <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24 whitespace-nowrap">
                    상태
                  </th>
                  <th className="text-left py-2.5 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32 whitespace-nowrap">
                    유입 파트너
                  </th>
                  {showDocsMatrix && (
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      취합 서류
                    </th>
                  )}
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32 whitespace-nowrap">
                    날짜
                  </th>
                  {(canDelete || (showDocsMatrix && docsInteractive)) && (
                    <th className="py-2.5 px-2 w-10" aria-label="행 작업" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {localLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{lead.customer_name}</div>
                    </td>
                    <td className="py-3 px-2 w-24 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <LeadStatusBadge status={lead.consultation_status} />
                        {lead.assigned_attorney_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full max-w-full truncate">
                            ⚖️ {lead.assigned_attorney_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 w-32 whitespace-nowrap">
                      <PartnerInflowCell
                    partnerName={lead.partner_name}
                    lineageLabel={lead.lineage_label}
                    inflow={lead.inflow}
                    attributionTrace={lead.attribution_trace}
                    onClick={() => openLead(lead)}
                  />
                    </td>
                    {showDocsMatrix && (
                      <td className="py-3 px-4 min-w-0 align-top">
                        <DocumentsMatrixBadges
                          docsStatus={deriveLeadDocsStatus(lead)}
                          interactive={docsInteractive}
                          leadId={lead.id}
                          customerName={lead.customer_name}
                          docFiles={deriveLeadDocFiles(lead)}
                      otherDocs={parseOtherDocs(lead.other_docs)}
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 text-xs text-slate-400 tabular-nums whitespace-nowrap w-32">
                      {lead.created_at.slice(0, 10)}
                    </td>
                    {(canDelete || (showDocsMatrix && docsInteractive)) && (
                      <td className="py-3 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-0.5">
                          {showDocsMatrix && docsInteractive && (
                            <BulkDocumentsDownloadButton
                              leadId={lead.id}
                              customerName={lead.customer_name}
                              docsStatus={deriveLeadDocsStatus(lead)}
                            />
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, lead.id)}
                              disabled={deletingId === lead.id}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="접수 삭제"
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
        </>
      )}

      <CustomerDetailModal
        row={detailRow}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        canChangeStatus={resolvePanelRole(viewerRole) !== "파트너"}
        canWriteMemo={resolvePanelRole(viewerRole) !== "파트너"}
        canDownloadContract={canDownloadContract}
        showDocuments={showDocsMatrix}
        viewerRole={viewerRole}
        onNotesUpdated={(id, notes) => {
          setLocalLeads((prev) =>
            prev.map((l) => (l.id === id ? { ...l, notes } : l)),
          );
          setDetailRow((prev) =>
            prev?.id === id ? { ...prev, notes, comments: notesToComments(notes) } : prev,
          );
        }}
        onCommentsUpdated={(id, nextComments) => {
          setDetailRow((prev) =>
            prev?.id === id ? { ...prev, comments: nextComments } : prev,
          );
        }}
        onStatusUpdated={(id, status, notes) => {
          handleStatusChanged(id, status);
          if (notes !== undefined) {
            setDetailRow((prev) =>
              prev?.id === id
                ? { ...prev, consultationStatus: status, notes, comments: notesToComments(notes) }
                : prev,
            );
          }
        }}
        onDocsUpdated={(id, patch) => {
          setLocalLeads((prev) =>
            prev.map((l) =>
              l.id === id
                ? {
                    ...l,
                    docs_status: patch.docs_status ?? l.docs_status,
                  }
                : l,
            ),
          );
          setDetailRow((prev) =>
            prev?.id === id ? applyDocsPatchToDetailRow(prev, patch) : prev,
          );
        }}
        onOtherDocsUpdated={(id, otherDocs) => {
          setLocalLeads((prev) =>
            prev.map((l) => (l.id === id ? { ...l, other_docs: otherDocs } : l)),
          );
          setDetailRow((prev) =>
            prev?.id === id ? applyOtherDocsPatchToDetailRow(prev, otherDocs) : prev,
          );
        }}
      />

      <LeadDetailPanel
        lead={docsInteractive ? null : selected}
        role={resolvePanelRole(viewerRole)}
        onClose={() => setSelected(null)}
        onStatusChanged={handleStatusChanged}
        attorneys={attorneys}
        onAssigned={handleAssigned}
      />
    </>
  );
}
