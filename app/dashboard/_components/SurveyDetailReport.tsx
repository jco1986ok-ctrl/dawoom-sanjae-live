"use client";

import { ClipboardList } from "lucide-react";
import {
  buildSurveyReportSections,
  detectSurveyCategory,
  parseSurveyFieldMap,
  type SurveyCategory,
} from "@/lib/lead-survey-report";

const CATEGORY_BADGE: Record<SurveyCategory, string> = {
  bone: "bg-orange-50 text-orange-800 border-orange-200",
  hearing: "bg-blue-50 text-blue-800 border-blue-200",
  respiratory: "bg-teal-50 text-teal-800 border-teal-200",
  overwork: "bg-red-50 text-red-800 border-red-200",
  stress: "bg-violet-50 text-violet-800 border-violet-200",
  accident: "bg-amber-50 text-amber-800 border-amber-200",
  legacy: "bg-slate-100 text-slate-700 border-slate-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
};

const CATEGORY_LABEL: Record<SurveyCategory, string> = {
  bone: "근골격계",
  hearing: "난청",
  respiratory: "호흡기",
  overwork: "뇌심혈관",
  stress: "정신건강",
  accident: "기타",
  legacy: "구버전 설문",
  general: "일반",
};

interface Props {
  notes: string | null;
  diseaseName?: string | null;
  className?: string;
}

export function SurveyDetailReport({ notes, diseaseName, className = "" }: Props) {
  const sections = buildSurveyReportSections(notes, diseaseName);
  const fields = parseSurveyFieldMap(notes);
  const category = detectSurveyCategory(fields, diseaseName);
  const hasContent = sections.some((s) => s.items.length > 0);

  if (!hasContent && !notes?.trim()) {
    return (
      <div className={`bg-gray-50 rounded-xl p-5 text-center ${className}`}>
        <p className="text-sm text-gray-400">작성된 설문 상세 내용이 없습니다.</p>
      </div>
    );
  }

  if (!hasContent && notes?.trim()) {
    return (
      <div className={`bg-gray-50 rounded-xl p-5 mt-4 ${className}`}>
        <ReportHeader category={category} />
        <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans mt-4">
          {notes}
        </pre>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-xl p-5 mt-4 ${className}`}>
      <ReportHeader category={category} />

      <div className="flex flex-col gap-5 mt-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span>{section.emoji}</span>
              {section.title}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {section.items.map((item) => (
                <li key={`${section.title}-${item.label}`} className="min-w-0">
                  <SurveyFieldRow label={item.label} value={item.value} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportHeader({ category }: { category: SurveyCategory }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[#0f2d5e] shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">설문 상세 보고서</h3>
      </div>
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${CATEGORY_BADGE[category]}`}
      >
        {CATEGORY_LABEL[category]}
      </span>
    </div>
  );
}

function SurveyFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5 break-keep">{label}</p>
      <p className="text-sm text-gray-900 font-medium leading-snug break-words whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}
