"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import type { LeadDetail } from "@/lib/lead-detail";
import { computeV2DailyBriefing } from "@/lib/v2-task-aging";
import { shouldUseV2MyTasksView } from "@/lib/v2-my-tasks";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";

interface Props {
  leads: LeadDetail[];
  viewerUserId: string;
  currentUserRole: DashboardTestRole;
}

function briefingStorageKey(viewerUserId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `v2-daily-briefing:${today}:${viewerUserId}`;
}

export default function V2DailyBriefingModal({
  leads,
  viewerUserId,
  currentUserRole,
}: Props) {
  const [open, setOpen] = useState(false);

  const showBriefing = shouldUseV2MyTasksView(currentUserRole);

  const summary = useMemo(
    () => (showBriefing ? computeV2DailyBriefing(leads, viewerUserId) : null),
    [leads, viewerUserId, showBriefing],
  );

  useEffect(() => {
    if (!showBriefing || !summary || !viewerUserId) return;
    if (summary.staleCount === 0 && summary.callbackTodayCount === 0) return;

    const key = briefingStorageKey(viewerUserId);
    if (sessionStorage.getItem(key)) return;

    setOpen(true);
    sessionStorage.setItem(key, "1");
  }, [showBriefing, summary, viewerUserId]);

  if (!open || !summary) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="브리핑 닫기"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-labelledby="v2-daily-briefing-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-semibold text-[#0f2d5e] uppercase tracking-wide">
              Daily Briefing
            </p>
            <h2 id="v2-daily-briefing-title" className="text-lg font-bold text-slate-900 mt-1">
              오늘의 담당 업무 요약
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              배정 {summary.totalAssigned}건 중 확인이 필요한 항목입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 grid gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <AlertTriangle className="size-5 text-red-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800">지연 상태 (7일+)</p>
              <p className="text-2xl font-bold text-red-700 tabular-nums">{summary.staleCount}건</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
            <CalendarClock className="size-5 text-sky-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sky-900">오늘 콜백 예정</p>
              <p className="text-2xl font-bold text-sky-700 tabular-nums">
                {summary.callbackTodayCount}건
              </p>
            </div>
          </div>

          {(summary.staleSamples.length > 0 || summary.callbackSamples.length > 0) && (
            <ul className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-lg px-3 py-2.5">
              {summary.staleSamples.map((s) => (
                <li key={`stale-${s.id}`} className="truncate">
                  · 지연 — {s.customerName}
                </li>
              ))}
              {summary.callbackSamples.map((s) => (
                <li key={`cb-${s.id}`} className="truncate">
                  · 콜백 — {s.customerName}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full min-h-[44px] rounded-xl bg-[#0f2d5e] text-white text-sm font-bold hover:bg-[#1a3d7a] transition-colors"
          >
            확인하고 업무 시작
          </button>
        </div>
      </div>
    </div>
  );
}
