"use client";

import { ClipboardList, FileText } from "lucide-react";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { TEST_ROLE_LABEL } from "@/lib/dashboard-rbac";
import { cn } from "@/lib/utils";

interface Props {
  role: DashboardTestRole;
  urgentCount?: number;
  staleCount?: number;
}

const ROLE_HINT: Partial<Record<DashboardTestRole, string>> = {
  마스터: "전체 접수·배정·상태를 고객(DB) 탭에서 관리합니다.",
  총괄파트너: "조직 접수와 파트너 라인을 고객·파트너 탭에서 확인합니다.",
  대표노무사: "배당·심사 건은 고객(DB) 탭과 업무 대기 현황을 우선 확인하세요.",
  노무사: "내 담당 사건은 고객(DB) 탭 · 내 할 일 보드에서 처리합니다.",
  일반팀원: "할당된 건은 고객(DB) 탭 · 3인 협업 보드에서 진행하세요.",
};

/** 내근 담당자 — 링크 대신 업무 안내 스트립 (링크 히어로 숨김) */
export default function V2InternalOverviewBrief({
  role,
  urgentCount = 0,
  staleCount = 0,
}: Props) {
  const hasAlert = urgentCount > 0 || staleCount > 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3",
        hasAlert
          ? "border-amber-200 bg-amber-50/80"
          : "border-slate-200 bg-slate-50/90",
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            hasAlert ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600",
          )}
        >
          <ClipboardList className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {TEST_ROLE_LABEL[role]} · 내근 업무 보드
          </p>
          <p className="text-xs text-slate-600 mt-0.5 break-keep leading-relaxed">
            {ROLE_HINT[role] ?? "고객(DB) 탭에서 상담·상태를 관리하세요."}
            <span className="text-slate-400">
              {" "}
              (고객·동료 초대 링크는 영업 파트너 화면에만 표시됩니다)
            </span>
          </p>
        </div>
      </div>

      {hasAlert && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <FileText className="size-3.5" />
              신규·부재 {urgentCount}건
            </span>
          )}
          {staleCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
              지연 {staleCount}건
            </span>
          )}
        </div>
      )}
    </div>
  );
}
