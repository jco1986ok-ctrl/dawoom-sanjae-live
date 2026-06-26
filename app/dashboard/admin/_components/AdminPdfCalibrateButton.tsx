"use client";

import Link from "next/link";
import { FilePenLine, ChevronRight } from "lucide-react";

export default function AdminPdfCalibrateButton() {
  return (
    <Link
      href="/dashboard/admin/pdf-calibrate"
      className="group flex items-center gap-3 w-full sm:w-auto rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <FilePenLine className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold">PDF 좌표 보정</span>
        <span className="block text-[11px] text-blue-200/90">
          위임장·선임·약정서 글자 위치 조정
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
