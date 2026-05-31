"use client";

import { ChevronLeft } from "lucide-react";

type WorkRelation = "work-related" | "not-sure" | "not-related" | null;
type SanjaeIntent = "yes" | "considering" | "not-sure" | "no" | null;

interface Step5SelfAwarenessProps {
  workRelation: WorkRelation;
  sanjaeIntent: SanjaeIntent;
  additionalComment: string;
  onWorkRelationChange: (value: WorkRelation) => void;
  onSanjaeIntentChange: (value: SanjaeIntent) => void;
  onAdditionalCommentChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const workRelationOptions = [
  { id: "work-related" as const, label: "일 때문에 생긴 것 같음" },
  { id: "not-sure" as const, label: "잘 모르겠음" },
  { id: "not-related" as const, label: "그렇지 않은 것 같음" },
];

const sanjaeIntentOptions = [
  { id: "yes" as const, label: "신청 의사 있음" },
  { id: "considering" as const, label: "검토 중" },
  { id: "not-sure" as const, label: "잘 모르겠음" },
  { id: "no" as const, label: "없음" },
];

export function Step5SelfAwareness({
  workRelation,
  sanjaeIntent,
  additionalComment,
  onWorkRelationChange,
  onSanjaeIntentChange,
  onAdditionalCommentChange,
  onPrev,
  onNext,
}: Step5SelfAwarenessProps) {
  const canProceed = workRelation !== null && sanjaeIntent !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            className="text-white p-2 -ml-2 active:opacity-70"
            aria-label="이전으로"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <span className="text-white text-lg font-medium">5 / 6</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 flex flex-col overflow-y-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          본인의 생각을 알려주세요.
        </h1>

        {/* Work Relation */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            현재 증상이 업무와 관련 있다고 생각하시나요?
          </label>
          <div className="space-y-3">
            {workRelationOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onWorkRelationChange(option.id)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  active:scale-[0.98]
                  ${
                    workRelation === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white"
                  }
                `}
              >
                <span className="text-lg font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sanjae Intent */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            산재 신청 의사가 있으신가요?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {sanjaeIntentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onSanjaeIntentChange(option.id)}
                className={`
                  p-4 rounded-xl border-2 text-center transition-all
                  active:scale-[0.98]
                  ${
                    sanjaeIntent === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white"
                  }
                `}
              >
                <span className="text-base font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Comment */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            추가로 하고 싶은 말씀 (선택)
          </label>
          <textarea
            value={additionalComment}
            onChange={(e) => onAdditionalCommentChange(e.target.value)}
            placeholder="자유롭게 적어주세요"
            rows={4}
            className="w-full text-lg p-4 border-2 border-border rounded-xl bg-white
                       focus:border-primary focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[20px]" />

        {/* Navigation Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={onPrev}
            className="flex-1 bg-secondary text-foreground text-xl font-bold py-5 rounded-2xl active:scale-[0.98]"
          >
            이전
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`
              flex-[2] text-xl font-bold py-5 rounded-2xl transition-all
              ${
                canProceed
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
