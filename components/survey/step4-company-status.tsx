"use client";

import { ChevronLeft } from "lucide-react";

type CurrentStatus = "working" | "considering-leave" | "considering-quit" | "already-left" | null;
type CompanyAwareness = "informed" | "not-informed" | null;
type SanjaeDiscussion = "discussed" | "not-discussed" | null;

interface Step4CompanyStatusProps {
  currentStatus: CurrentStatus;
  companyAwareness: CompanyAwareness;
  sanjaeDiscussion: SanjaeDiscussion;
  companyReaction: string;
  onCurrentStatusChange: (value: CurrentStatus) => void;
  onCompanyAwarenessChange: (value: CompanyAwareness) => void;
  onSanjaeDiscussionChange: (value: SanjaeDiscussion) => void;
  onCompanyReactionChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const currentStatusOptions = [
  { id: "working" as const, label: "힘들지만 근무 중" },
  { id: "considering-leave" as const, label: "휴직 고민 중" },
  { id: "considering-quit" as const, label: "퇴사 고민 중" },
  { id: "already-left" as const, label: "이미 휴직·퇴사" },
];

const companyAwarenessOptions = [
  { id: "informed" as const, label: "회사에 아픔을 알림" },
  { id: "not-informed" as const, label: "알리지 않음" },
];

const sanjaeDiscussionOptions = [
  { id: "discussed" as const, label: "산재 이야기를 꺼낸 적 있음" },
  { id: "not-discussed" as const, label: "없음" },
];

export function Step4CompanyStatus({
  currentStatus,
  companyAwareness,
  sanjaeDiscussion,
  companyReaction,
  onCurrentStatusChange,
  onCompanyAwarenessChange,
  onSanjaeDiscussionChange,
  onCompanyReactionChange,
  onPrev,
  onNext,
}: Step4CompanyStatusProps) {
  const canProceed = currentStatus !== null && companyAwareness !== null && sanjaeDiscussion !== null;

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
          <span className="text-white text-lg font-medium">4 / 6</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 flex flex-col overflow-y-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          현재 상황을 알려주세요.
        </h1>

        {/* Current Status */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            현재 상태
          </label>
          <div className="grid grid-cols-2 gap-3">
            {currentStatusOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onCurrentStatusChange(option.id)}
                className={`
                  p-4 rounded-xl border-2 text-center transition-all
                  active:scale-[0.98]
                  ${
                    currentStatus === option.id
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

        {/* Company Awareness */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            회사에 알림 여부
          </label>
          <div className="space-y-3">
            {companyAwarenessOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onCompanyAwarenessChange(option.id)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  active:scale-[0.98]
                  ${
                    companyAwareness === option.id
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

        {/* Sanjae Discussion */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            산재 이야기 여부
          </label>
          <div className="space-y-3">
            {sanjaeDiscussionOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onSanjaeDiscussionChange(option.id)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  active:scale-[0.98]
                  ${
                    sanjaeDiscussion === option.id
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

        {/* Company Reaction */}
        {companyAwareness === "informed" && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-lg font-medium text-foreground mb-3">
              회사의 반응은 어땠나요?
            </label>
            <textarea
              value={companyReaction}
              onChange={(e) => onCompanyReactionChange(e.target.value)}
              placeholder="알리셨다면 적어주세요 (선택)"
              rows={3}
              className="w-full text-lg p-4 border-2 border-border rounded-xl bg-white
                         focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>
        )}

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
