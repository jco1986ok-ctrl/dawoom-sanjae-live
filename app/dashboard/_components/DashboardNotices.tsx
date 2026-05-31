"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, Megaphone, PenLine, X, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Notice } from "@/lib/types";
import { createNoticeAction } from "../_actions/notices";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NoticeAccordionItem({ notice }: { notice: Notice }) {
  const [open, setOpen] = useState(notice.is_important);

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        notice.is_important
          ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
      >
        <Megaphone
          className={`w-4 h-4 shrink-0 ${notice.is_important ? "text-amber-600" : "text-[#0f2d5e]"}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{notice.title}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(notice.created_at)}</p>
        </div>
        {notice.is_important && (
          <span className="shrink-0 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            중요
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-black/5">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{notice.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNoticeCreateModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(createNoticeAction, null);

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">✏️ 공지사항 작성</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form action={formAction} className="p-5 space-y-4">
          <div>
            <label htmlFor="notice-title" className="text-xs font-bold text-slate-600 mb-1 block">
              제목
            </label>
            <input
              id="notice-title"
              name="title"
              required
              placeholder="공지 제목을 입력하세요"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
            />
          </div>
          <div>
            <label htmlFor="notice-content" className="text-xs font-bold text-slate-600 mb-1 block">
              본문
            </label>
            <textarea
              id="notice-content"
              name="content"
              required
              rows={6}
              placeholder="파트너에게 전달할 내용을 입력하세요"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" name="is_important" className="rounded border-slate-300" />
            <span className="font-semibold">중요 (상단 고정 · 강조 표시)</span>
          </label>

          {state?.success === false && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {state.error}
            </p>
          )}
          {state?.success === true && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#0f2d5e] text-white font-bold py-3 text-sm cursor-pointer hover:brightness-110 disabled:opacity-50"
          >
            {isPending ? "등록 중…" : "공지 등록하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardNotices({
  notices,
  isAdmin,
}: {
  notices: Notice[];
  isAdmin: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const items = notices.slice(0, 2);

  return (
    <>
      <section className="mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <span>📢</span> 최근 공지사항
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f2d5e] text-white text-xs font-bold px-3 py-2 shadow-sm cursor-pointer hover:brightness-110 active:scale-[0.98] transition-transform"
            >
              <PenLine className="w-3.5 h-3.5" />
              ✏️ 공지사항 작성
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {items.map((notice) => (
            <NoticeAccordionItem key={notice.id} notice={notice} />
          ))}
        </div>
      </section>

      {createOpen && <AdminNoticeCreateModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
