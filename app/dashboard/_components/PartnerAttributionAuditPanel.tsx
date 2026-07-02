"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import {
  PARTNER_AUDIT_STATUS_LABEL,
  type PartnerAuditRow,
  type PartnerAuditStatus,
} from "@/lib/lead-partner-audit";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<PartnerAuditStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ref_unresolved: "bg-amber-50 text-amber-800 border-amber-200",
  name_unresolved: "bg-orange-50 text-orange-800 border-orange-200",
  natural: "bg-slate-100 text-slate-600 border-slate-200",
  missing: "bg-red-50 text-red-700 border-red-200",
  notes_traceable: "bg-violet-50 text-violet-800 border-violet-200",
};

type AuditResponse = {
  rows: PartnerAuditRow[];
  summary: {
    total: number;
    needsReview: number;
    confirmed: number;
    byStatus: Partial<Record<PartnerAuditStatus, number>>;
  };
  meta: { days: number; since: string; onlyNeedsReview: boolean };
};

export function PartnerAttributionAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(true);
  const [days, setDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days: String(days),
        needsReview: needsReviewOnly ? "1" : "0",
      });
      const res = await fetch(`/api/dashboard/partner-attribution-audit?${params}`);
      const json = (await res.json()) as AuditResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "조회 실패");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [days, needsReviewOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/master"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            대시보드로
          </Link>
          <h1 className="text-xl font-black text-[#0f2d5e]">파트너 유입 확인</h1>
          <p className="text-sm text-slate-500 mt-1">
            신규 접수 중 파트너·유입 라인이 확인되지 않는 건을 조회합니다. DB 컬럼과 접수 메모의
            [추천인]/[유입 링크]를 함께 분석합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          새로고침
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={needsReviewOnly}
            onChange={(e) => setNeedsReviewOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          확인 필요 건만 보기
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          기간
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
            <option value={180}>최근 180일</option>
            <option value={365}>최근 1년</option>
          </select>
        </label>
        {data && (
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
              전체 {data.summary.total}건
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              확인됨 {data.summary.confirmed}건
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
              확인 필요 {data.summary.needsReview}건
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          접수 데이터 분석 중…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data && data.rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          조건에 맞는 접수가 없습니다.
        </div>
      )}

      {!loading && !error && data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">접수일</th>
                <th className="px-4 py-3">고객</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">유입 확인</th>
                <th className="px-4 py-3">유입 라인</th>
                <th className="px-4 py-3">파트너</th>
                <th className="px-4 py-3">DB / 메모 단서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                    {row.created_at.slice(0, 10)}
                    {row.isDynamicFormV2 && (
                      <span className="mt-1 block text-[10px] text-blue-600 font-semibold">
                        DynamicForm v2
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.customer_name}</div>
                    <div className="text-xs text-slate-400">{row.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {row.consultation_status}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        STATUS_STYLE[row.status],
                      )}
                    >
                      {row.needsReview ? (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      )}
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    <div className="text-xs font-medium text-slate-800">{row.lineageLabel}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{row.inflowLabel}</div>
                    {row.inflowLinkParam && (
                      <div className="text-[10px] font-mono text-indigo-600 mt-0.5 truncate max-w-[200px]">
                        {row.inflowLinkParam}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    {row.partnerName ? (
                      <>
                        <div className="font-semibold text-slate-800 text-xs">{row.partnerName}</div>
                        {row.partnerAgentId && (
                          <div className="text-[10px] font-mono text-slate-500">{row.partnerAgentId}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-600 max-w-[280px]">
                    <div>
                      <span className="text-slate-400">referral_source:</span>{" "}
                      {row.referral_source ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">referrer:</span> {row.referrer ?? "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">referred_by:</span>{" "}
                      {row.referred_by_user_id ?? "—"}
                    </div>
                    {row.notesExcerpt && (
                      <div className="mt-1 text-violet-700 font-medium">{row.notesExcerpt}</div>
                    )}
                    {row.notesAttribution.refFromLink && !row.partnerName && (
                      <div className="mt-1 text-amber-700">
                        메모 ref: {row.notesAttribution.refFromLink}
                      </div>
                    )}
                    {row.notesAttribution.nameFromLink && !row.partnerName && (
                      <div className="mt-1 text-amber-700">
                        메모 name: {row.notesAttribution.nameFromLink}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        상태 설명 — {Object.entries(PARTNER_AUDIT_STATUS_LABEL).map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </p>
    </div>
  );
}
