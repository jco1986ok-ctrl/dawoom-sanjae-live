"use client";

import { useEffect, useState, useTransition } from "react";
import {
  X,
  Phone,
  User,
  Calendar,
  Building2,
  Stethoscope,
  Clock,
  Loader2,
  MessageSquare,
  Eye,
  Scale,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadStatusSelect } from "./LeadStatusSelect";
import LeadStatusBadge from "./LeadStatusBadge";
import {
  parseConsultTimeline,
  type ConsultComment,
} from "@/lib/lead-consult-memos";
import { appendLeadConsultMemo } from "../_actions/leads";
import { SurveyDetailReport } from "./SurveyDetailReport";
import { deriveLeadDocFiles, type LeadDocFilesMap, type LeadDocKey } from "@/lib/lead-doc-files";
import { deriveLeadDocsStatus, type LeadDocsStatus, canAdminManageLeadDocuments, canViewLeadDocumentsReadOnly } from "@/lib/lead-docs-status";
import { formatLeadDiseaseDisplay } from "@/lib/form-array-fields";
import { ContractPdfPreviewBlock } from "./ContractPdfPreviewBlock";
import { AdminDocumentCollectionPanel } from "./AdminDocumentCollectionPanel";
import { WeimSignLinkCopyButton } from "./WeimSignLinkCopyButton";
import DocumentsMatrixBadges from "./DocumentsMatrixBadges";
import { OtherDocsBadges } from "./OtherDocsBadges";
import { LineagePathBadge } from "@/components/LineagePathBadge";
import { InflowLinkBadge } from "@/components/LeadAttributionCell";
import { describeInflowLink } from "@/lib/lead-attribution";
import type { UserLineageNode } from "@/lib/user-lineage";
import type { InflowInfo } from "@/lib/lead-attribution";
import type { OtherDocEntry } from "@/lib/lead-other-docs";
import { parseOtherDocs } from "@/lib/lead-other-docs";
import { cn } from "@/lib/utils";
import DiseaseCategoryBadge from "./DiseaseCategoryBadge";
import {
  DISEASE_CATEGORIES,
  resolveDiseaseCategory,
  type DiseaseCategory,
} from "@/lib/disease-category";
import { updateLeadDiseaseCategory } from "../_actions/leads";

type MobileDetailTab = "info" | "comments" | "documents";

export interface CustomerDetailRow {
  id: string;
  customerName: string;
  phone: string;
  diseaseName: string;
  diseaseCategory: DiseaseCategory | null;
  submittedAt: string;
  consultationStatus: string;
  partnerName: string;
  assignedAttorneyName: string | null;
  notes: string | null;
  pdfUrl: string | null;
  hasWeim: boolean;
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  comments: ConsultComment[];
  lineage?: UserLineageNode[];
  lineageLabel?: string;
  inflow?: InflowInfo | null;
  referralSource?: string | null;
  referrer?: string | null;
  currentOwnerRole?: import("@/lib/collaboration-workflow").CollaborationOwnerRole;
}

function formatTimelineDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

interface Props {
  row: CustomerDetailRow | null;
  open: boolean;
  onClose: () => void;
  canChangeStatus: boolean;
  canWriteMemo: boolean;
  /** 마스터·총괄·대표노무사·노무사 — 위임 계약서 다운로드 */
  canDownloadContract?: boolean;
  /** 서류 매트릭스 열람·업로드 */
  showDocuments?: boolean;
  viewerRole?: string;
  onNotesUpdated: (leadId: string, notes: string) => void;
  onStatusUpdated: (leadId: string, status: string, notes?: string) => void;
  onDocsUpdated?: (
    leadId: string,
    patch: {
      docsStatus: LeadDocsStatus;
      docFiles: LeadDocFilesMap;
      docs_status?: unknown;
    },
  ) => void;
  onOtherDocsUpdated?: (leadId: string, otherDocs: OtherDocEntry[]) => void;
  onDiseaseCategoryUpdated?: (leadId: string, category: DiseaseCategory | null) => void;
  /** V2 협업 바통 터치 영역 (V2에서만 전달) */
  collaborationBar?: React.ReactNode;
}

export function CustomerDetailModal({
  row,
  open,
  onClose,
  canChangeStatus,
  canWriteMemo,
  canDownloadContract = false,
  showDocuments = false,
  viewerRole = "",
  onNotesUpdated,
  onStatusUpdated,
  onDocsUpdated,
  onOtherDocsUpdated,
  onDiseaseCategoryUpdated,
  collaborationBar,
}: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCategoryPending, startCategoryTransition] = useTransition();
  const [localDocsStatus, setLocalDocsStatus] = useState<LeadDocsStatus | null>(null);
  const [localDocFiles, setLocalDocFiles] = useState<LeadDocFilesMap | null>(null);
  const [localOtherDocs, setLocalOtherDocs] = useState<OtherDocEntry[] | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileDetailTab>("info");
  const readOnly = !canChangeStatus && !canWriteMemo;

  useEffect(() => {
    if (open) setMobileTab("info");
  }, [open, row?.id]);

  useEffect(() => {
    if (open && row) {
      setLocalDocsStatus(row.docsStatus);
      setLocalDocFiles(row.docFiles);
      setLocalOtherDocs(row.otherDocs);
    }
  }, [open, row?.id, row?.docsStatus, row?.docFiles, row?.otherDocs]);

  useEffect(() => {
    if (open) {
      setDraft("");
      setError("");
      setCategoryError("");
    }
  }, [open, row?.id]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleRegister = () => {
    if (!row || !draft.trim() || !canWriteMemo) return;
    startTransition(async () => {
      const result = await appendLeadConsultMemo(row.id, draft.trim());
      if (result.success && result.notes) {
        onNotesUpdated(row.id, result.notes);
        setDraft("");
      } else {
        setError(result.error ?? "등록 실패");
      }
    });
  };

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md p-8 gap-0 overflow-hidden"
        >
          <DialogTitle className="sr-only">고객 상세 정보</DialogTitle>
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f2d5e]" />
            <p className="text-sm">고객 정보를 불러오는 중…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const docsStatus = localDocsStatus ?? row.docsStatus;
  const docFiles = localDocFiles ?? row.docFiles;
  const otherDocs = localOtherDocs ?? row.otherDocs;
  const hasContractPdf = Boolean(row.pdfUrl || row.hasWeim || docsStatus.mandateContract);
  const showAdminDocPanel = showDocuments && canAdminManageLeadDocuments(viewerRole);
  const showDocumentsReadOnly = showDocuments && canViewLeadDocumentsReadOnly(viewerRole);
  const showDocumentsTab = showAdminDocPanel || showDocumentsReadOnly;
  const showWeimSignLink = showAdminDocPanel && !hasContractPdf;

  const handleDocsUpdated = (
    _docKey: LeadDocKey,
    patch: {
      docsStatus: LeadDocsStatus;
      docFiles: LeadDocFilesMap;
      docs_status?: unknown;
    },
  ) => {
    setLocalDocsStatus(patch.docsStatus);
    setLocalDocFiles((prev) => ({ ...(prev ?? row.docFiles), ...patch.docFiles }));
    onDocsUpdated?.(row.id, patch);
  };

  const handleOtherDocsUpdated = (next: OtherDocEntry[]) => {
    setLocalOtherDocs(next);
    onOtherDocsUpdated?.(row.id, next);
  };

  const handleDiseaseCategoryChange = (next: string) => {
    if (!canChangeStatus) return;
    const category = next === "" ? null : (next as DiseaseCategory);
    startCategoryTransition(async () => {
      const result = await updateLeadDiseaseCategory(row.id, category);
      if (result.success) {
        onDiseaseCategoryUpdated?.(row.id, category);
        setCategoryError("");
      } else {
        setCategoryError(result.error ?? "카테고리 저장 실패");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden flex flex-col
          max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0
          max-sm:max-w-full max-sm:w-full max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none
          sm:max-w-4xl lg:max-w-5xl sm:max-h-[90vh]"
      >
        {/* 헤더 + 닫기 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0f2d5e]" />
            고객 상세 정보
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {collaborationBar && (
          <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            {collaborationBar}
          </div>
        )}

        {readOnly && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 shrink-0">
            <Eye className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700">열람 전용</strong>
              {showDocumentsReadOnly
                ? " — 설문·서류·계약서를 확인할 수 있습니다. 상태 변경·서류 업로드는 불가합니다."
                : showAdminDocPanel
                  ? " — 상담 이력·설문 확인 가능. 서류 업로드는 가능하나 상태 변경·코멘트 작성은 불가합니다."
                  : " — 노무사 상담 코멘트와 진행 상태 변경 이력을 확인할 수 있습니다."}
            </span>
          </div>
        )}

        {/* 고객 정보 / 상담 / 서류 탭 */}
        <div className="shrink-0 flex border-b border-slate-200 bg-white">
          <MobileTabButton
            active={mobileTab === "info"}
            onClick={() => setMobileTab("info")}
            label="고객 정보"
          />
          <MobileTabButton
            active={mobileTab === "comments"}
            onClick={() => setMobileTab("comments")}
            label="상담 코멘트"
            badge={row.comments.length > 0 ? String(row.comments.length) : undefined}
          />
          {showDocumentsTab && (
            <MobileTabButton
              active={mobileTab === "documents"}
              onClick={() => setMobileTab("documents")}
              label="서류 취합"
            />
          )}
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          {/* 좌측: 기본 정보 & 상태 */}
          <div
            className={cn(
              "lg:w-[48%] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white",
              "lg:overflow-y-auto lg:block",
              mobileTab === "info" ? "flex-1 overflow-y-auto" : "hidden lg:block",
            )}
          >
            <div className="p-5 flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  고객명
                </p>
                <p className="text-xl font-black text-slate-900">{row.customerName}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <InfoItem icon={<Phone className="w-4 h-4" />} label="연락처" value={row.phone} />
                <InfoItem icon={<Stethoscope className="w-4 h-4" />} label="질병명" value={row.diseaseName} />
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    질병 카테고리
                  </p>
                  <div className="flex flex-col gap-2">
                    {row.diseaseCategory && (
                      <DiseaseCategoryBadge category={row.diseaseCategory} />
                    )}
                    {canChangeStatus ? (
                      <select
                        value={row.diseaseCategory ?? ""}
                        onChange={(e) => handleDiseaseCategoryChange(e.target.value)}
                        disabled={isCategoryPending}
                        className="w-full text-sm font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2
                          focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 disabled:opacity-60"
                        aria-label="질병 카테고리 분류"
                      >
                        <option value="">미분류</option>
                        {DISEASE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      !row.diseaseCategory && (
                        <p className="text-sm text-slate-500">미분류</p>
                      )
                    )}
                    {categoryError && (
                      <p className="text-[11px] text-red-600">{categoryError}</p>
                    )}
                  </div>
                </div>
                <InfoItem icon={<Building2 className="w-4 h-4" />} label="유입 파트너" value={row.partnerName} />
                <InfoItem icon={<Calendar className="w-4 h-4" />} label="접수일" value={row.submittedAt} />
                {row.assignedAttorneyName && (
                  <InfoItem
                    icon={<Scale className="w-4 h-4" />}
                    label="담당 노무사"
                    value={row.assignedAttorneyName}
                  />
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  유입 · 계정 라인
                </p>
                {(row.inflow || row.referralSource || row.referrer) && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5">무료조회 유입</p>
                    <InflowLinkBadge
                      inflow={
                        row.inflow ??
                        describeInflowLink(row.referralSource, row.referrer)
                      }
                    />
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 mb-1.5">유입 계정 라인</p>
                  {row.lineage && row.lineage.length > 0 ? (
                    <LineagePathBadge lineage={row.lineage} />
                  ) : (
                    <p className="text-sm text-slate-600 break-keep">
                      {row.lineageLabel && row.lineageLabel !== "—"
                        ? row.lineageLabel
                        : row.partnerName !== "—"
                          ? row.partnerName
                          : "유입 계정 미확인"}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  진행 상태
                </p>
                <div className="flex flex-col gap-2">
                  <LeadStatusBadge status={row.consultationStatus} />
                  <LeadStatusSelect
                    leadId={row.id}
                    value={row.consultationStatus}
                    disabled={!canChangeStatus}
                    className="w-full"
                    onChanged={(status, notes) => onStatusUpdated(row.id, status, notes)}
                  />
                  {!canChangeStatus && (
                    <p className="text-[11px] text-slate-400">상태 변경 권한이 없습니다.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  설문 상세 내용
                </p>
                <SurveyDetailReport
                  notes={row.notes}
                  diseaseName={row.diseaseName !== "—" ? row.diseaseName : null}
                  className="mt-0"
                />
              </div>

              {showDocumentsTab && (
                <CustomerDocumentsBlock
                  row={row}
                  docsStatus={docsStatus}
                  docFiles={docFiles}
                  otherDocs={otherDocs}
                  showAdminDocPanel={showAdminDocPanel}
                  showDocumentsReadOnly={showDocumentsReadOnly}
                  showWeimSignLink={showWeimSignLink}
                  canDownloadContract={canDownloadContract}
                  hasContractPdf={hasContractPdf}
                  onDocsUpdated={handleDocsUpdated}
                  onOtherDocsUpdated={handleOtherDocsUpdated}
                />
              )}

              {canDownloadContract && hasContractPdf && !showDocumentsTab && (
                <div className="pt-2 border-t border-slate-100">
                  <ContractPdfPreviewBlock
                    leadId={row.id}
                    customerName={row.customerName}
                    hasPdf={hasContractPdf}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 우측: 코멘트 타임라인 */}
          <div
            className={cn(
              "flex-1 flex flex-col min-h-0 bg-slate-50/80",
              mobileTab === "comments" ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0f2d5e]" />
                상담 코멘트 히스토리
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {row.comments.length}건 · 시간순 표시
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {row.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-sm">아직 등록된 상담 코멘트가 없습니다.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {row.comments.map((comment) => (
                    <li key={comment.id}>
                      <CommentBubble comment={comment} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canWriteMemo ? (
              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  새 코멘트 작성
                </label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="상담 내용, 통화 결과, 다음 조치 사항 등을 입력하세요..."
                  rows={3}
                  disabled={isPending}
                  className="w-full text-sm border-2 border-slate-200 rounded-xl px-4 py-3
                    focus:outline-none focus:border-[#0f2d5e] focus:ring-2 focus:ring-[#0f2d5e]/10
                    resize-none placeholder:text-slate-300 disabled:opacity-60"
                />
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={!draft.trim() || isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white
                      bg-[#0f2d5e] rounded-xl hover:bg-[#1a3d7a] transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isPending ? "등록 중..." : "등록"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="shrink-0 border-t border-slate-200 bg-slate-100/80 px-5 py-4">
                <p className="text-xs text-slate-500 text-center">
                  {showDocumentsReadOnly
                    ? "코멘트 작성·상태 변경은 노무사·관리자만 가능합니다."
                    : "코멘트 작성은 노무사·관리자만 가능합니다."}
                </p>
              </div>
            )}
          </div>

          {/* 서류 취합 전용 탭 (모바일·태블릿) */}
          {showDocumentsTab && (
            <div
              className={cn(
                "flex-1 overflow-y-auto bg-white min-h-0 lg:hidden",
                mobileTab === "documents" ? "block" : "hidden",
              )}
            >
              <div className="p-5">
                <CustomerDocumentsBlock
                  row={row}
                  docsStatus={docsStatus}
                  docFiles={docFiles}
                  otherDocs={otherDocs}
                  showAdminDocPanel={showAdminDocPanel}
                  showDocumentsReadOnly={showDocumentsReadOnly}
                  showWeimSignLink={showWeimSignLink}
                  canDownloadContract={canDownloadContract}
                  hasContractPdf={hasContractPdf}
                  onDocsUpdated={handleDocsUpdated}
                  onOtherDocsUpdated={handleOtherDocsUpdated}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDocumentsBlock({
  row,
  docsStatus,
  docFiles,
  otherDocs,
  showAdminDocPanel,
  showDocumentsReadOnly,
  showWeimSignLink,
  canDownloadContract,
  hasContractPdf,
  onDocsUpdated,
  onOtherDocsUpdated,
}: {
  row: CustomerDetailRow;
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  showAdminDocPanel: boolean;
  showDocumentsReadOnly: boolean;
  showWeimSignLink: boolean;
  canDownloadContract: boolean;
  hasContractPdf: boolean;
  onDocsUpdated: (
    docKey: LeadDocKey,
    patch: {
      docsStatus: LeadDocsStatus;
      docFiles: LeadDocFilesMap;
      docs_status?: unknown;
    },
  ) => void;
  onOtherDocsUpdated: (otherDocs: OtherDocEntry[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          서류 취합 · 기타 서류
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          항목별·기타 서류 모두 여러 파일을 한 번에 선택해 업로드할 수 있습니다.
        </p>
      </div>

      {showWeimSignLink && (
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-2">위임장 전자서명</p>
          <WeimSignLinkCopyButton leadId={row.id} />
          <p className="text-[10px] text-slate-400 mt-2">
            고객에게 링크를 보내 추가 입력 없이 위임장만 서명받을 수 있습니다.
          </p>
        </div>
      )}

      {showAdminDocPanel && (
        <AdminDocumentCollectionPanel
          leadId={row.id}
          customerName={row.customerName}
          docsStatus={docsStatus}
          docFiles={docFiles}
          otherDocs={otherDocs}
          diseaseCategory={row.diseaseCategory}
          onDocsUpdated={onDocsUpdated}
          onOtherDocsUpdated={onOtherDocsUpdated}
          className="mt-0"
        />
      )}

      {showDocumentsReadOnly && (
        <DocumentsReadOnlySection
          docsStatus={docsStatus}
          docFiles={docFiles}
          otherDocs={otherDocs}
          leadId={row.id}
          customerName={row.customerName}
        />
      )}

      {canDownloadContract && hasContractPdf && (
        <ContractPdfPreviewBlock
          leadId={row.id}
          customerName={row.customerName}
          hasPdf={hasContractPdf}
        />
      )}
    </div>
  );
}

function MobileTabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 min-w-0 px-2 py-3 text-xs sm:text-sm font-bold transition-colors relative",
        active
          ? "text-[#0f2d5e] bg-slate-50"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/60",
      )}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {label}
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0f2d5e]/10 text-[#0f2d5e]">
            {badge}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0f2d5e] rounded-full" />
      )}
    </button>
  );
}

function DocumentsReadOnlySection({
  docsStatus,
  docFiles,
  otherDocs,
  leadId,
  customerName,
}: {
  docsStatus: LeadDocsStatus;
  docFiles: LeadDocFilesMap;
  otherDocs: OtherDocEntry[];
  leadId: string;
  customerName: string;
}) {
  return (
    <>
      <p className="text-sm font-bold text-slate-800">📂 취합 서류 (열람 전용)</p>
      <DocumentsMatrixBadges
        docsStatus={docsStatus}
        interactive
        leadId={leadId}
        customerName={customerName}
        docFiles={docFiles}
      />
      {otherDocs.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-2">기타 서류</p>
          <OtherDocsBadges leadId={leadId} otherDocs={otherDocs} />
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">등록된 기타 서류가 없습니다.</p>
      )}
      <p className="text-[11px] text-slate-400">
        수집된 서류 뱃지를 탭하면 미리보기·다운로드할 수 있습니다.
      </p>
    </>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function CommentBubble({ comment }: { comment: ConsultComment }) {
  const isStatus = comment.kind === "status";

  return (
    <div
      className={`rounded-2xl px-4 py-3 border shadow-sm ${
        isStatus
          ? "bg-indigo-50/80 border-indigo-100"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            isStatus
              ? "bg-indigo-100 text-indigo-700"
              : "bg-cyan-100 text-cyan-800"
          }`}
        >
          {comment.author}
        </span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimelineDate(comment.date)}
        </span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
    </div>
  );
}

export function applyDocsPatchToDetailRow(
  row: CustomerDetailRow,
  patch: {
    docsStatus: LeadDocsStatus;
    docFiles: LeadDocFilesMap;
  },
): CustomerDetailRow {
  return {
    ...row,
    docsStatus: patch.docsStatus,
    docFiles: { ...row.docFiles, ...patch.docFiles },
  };
}

export function applyOtherDocsPatchToDetailRow(
  row: CustomerDetailRow,
  otherDocs: OtherDocEntry[],
): CustomerDetailRow {
  return { ...row, otherDocs };
}

export function buildCustomerDetailRow(lead: import("./LeadDetailPanel").LeadDetail): CustomerDetailRow {
  const notes = lead.notes;
  const diseaseCategory = resolveDiseaseCategory(
    lead.disease_category,
    lead.disease_name,
    notes,
  );
  return {
    id: lead.id,
    customerName: lead.customer_name,
    phone: lead.phone ?? "—",
    diseaseName: formatLeadDiseaseDisplay(notes, lead.disease_name),
    diseaseCategory,
    submittedAt: lead.created_at.slice(0, 10),
    consultationStatus: lead.consultation_status,
    partnerName:
      lead.partner_name ??
      lead.lineage?.[lead.lineage.length - 1]?.name ??
      "—",
    assignedAttorneyName: lead.assigned_attorney_name ?? null,
    notes,
    pdfUrl: lead.pdf_url ?? null,
    hasWeim: Boolean(lead.has_weim || lead.pdf_url),
    docsStatus: deriveLeadDocsStatus(lead),
    docFiles: deriveLeadDocFiles(lead),
    otherDocs: parseOtherDocs(lead.other_docs),
    comments: parseConsultTimeline(notes),
    lineage: lead.lineage ?? [],
    lineageLabel: lead.lineage_label ?? undefined,
    inflow: lead.inflow ?? null,
    referralSource: lead.referral_source ?? null,
    referrer: lead.referrer ?? null,
    currentOwnerRole: lead.current_owner_role
      ? (lead.current_owner_role as import("@/lib/collaboration-workflow").CollaborationOwnerRole)
      : undefined,
  };
}

export function notesToComments(notes: string | null): ConsultComment[] {
  return parseConsultTimeline(notes);
}
