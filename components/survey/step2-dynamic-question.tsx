"use client";

import { ChevronLeft } from "lucide-react";
import type { DiseaseCategory } from "./step1-category";

interface Step2DynamicQuestionProps {
  category: DiseaseCategory;
  answer: boolean | null;
  onAnswer: (answer: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}

const questionsByCategory: Record<Exclude<DiseaseCategory, null>, string> = {
  ear: "소음이 심한 현장(건설, 용접 등)에서 3년 이상 일하셨나요?",
  joint: "무거운 물건을 들거나 반복적인 동작으로 일을 하셨나요?",
  lung: "분진이나 돌가루 날리는 곳에서 일하셨나요?",
  heart: "최근 주 60시간 이상 일하거나 야간 근무를 하셨나요?",
};

export function Step2DynamicQuestion({
  category,
  answer,
  onAnswer,
  onPrev,
  onNext,
}: Step2DynamicQuestionProps) {
  const question = category ? questionsByCategory[category] : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            className="text-white p-2 -ml-2 active:opacity-70"
            aria-label="이전으로"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <span className="text-white text-lg font-medium">2 / 6</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col">
        <h1 className="text-2xl font-bold text-foreground mb-8 leading-relaxed">
          {question}
        </h1>

        {/* Answer Buttons */}
        <div className="space-y-4 mb-8">
          <button
            onClick={() => onAnswer(true)}
            className={`
              w-full p-6 rounded-2xl border-3 text-left transition-all
              active:scale-[0.98]
              ${
                answer === true
                  ? "border-primary bg-primary/5"
                  : "border-border bg-white"
              }
            `}
          >
            <span className="text-xl font-bold text-foreground">
              네, 그렇습니다
            </span>
          </button>

          <button
            onClick={() => onAnswer(false)}
            className={`
              w-full p-6 rounded-2xl border-3 text-left transition-all
              active:scale-[0.98]
              ${
                answer === false
                  ? "border-primary bg-primary/5"
                  : "border-border bg-white"
              }
            `}
          >
            <span className="text-xl font-bold text-foreground">
              아니요
            </span>
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-secondary rounded-xl p-5 mb-8">
          <p className="text-base text-muted-foreground leading-relaxed">
            정확히 모르셔도 괜찮습니다.
            <br />
            노무사가 상담 시 자세히 확인해 드립니다.
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onPrev}
            className="flex-1 bg-secondary text-foreground text-xl font-bold py-5 rounded-2xl active:scale-[0.98]"
          >
            이전
          </button>
          <button
            onClick={onNext}
            disabled={answer === null}
            className={`
              flex-[2] text-xl font-bold py-5 rounded-2xl transition-all
              ${
                answer !== null
                  ? "bg-primary text-white active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            다음
          </button>
        </div>
      </main>
    </div>
  );
}
