"use client";

import { ChevronLeft } from "lucide-react";

interface Step3DiagnosisProps {
  workYears: string;
  hasDiagnosis: boolean | null;
  diagnosisName: string;
  hospitalName: string;
  onWorkYearsChange: (value: string) => void;
  onHasDiagnosisChange: (value: boolean) => void;
  onDiagnosisNameChange: (value: string) => void;
  onHospitalNameChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Step3Diagnosis({
  workYears,
  hasDiagnosis,
  diagnosisName,
  hospitalName,
  onWorkYearsChange,
  onHasDiagnosisChange,
  onDiagnosisNameChange,
  onHospitalNameChange,
  onPrev,
  onNext,
}: Step3DiagnosisProps) {
  const canProceed = workYears.trim() !== "" && hasDiagnosis !== null;

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
          <span className="text-white text-lg font-medium">3 / 6</span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col overflow-y-auto">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          근무 기간과 진단 여부를
          <br />
          알려주세요.
        </h1>

        {/* Work Years Input */}
        <div className="mb-8">
          <label className="block text-lg font-medium text-foreground mb-3">
            해당 업무를 총 몇 년 정도 하셨나요?
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={workYears}
            onChange={(e) => onWorkYearsChange(e.target.value)}
            placeholder="예: 15년"
            className="w-full text-xl p-5 border-3 border-border rounded-2xl bg-white
                       focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Diagnosis Question */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-foreground mb-3">
            병원에서 관련 질환으로 진단을 받으셨나요?
          </label>
          <div className="space-y-3">
            <button
              onClick={() => onHasDiagnosisChange(true)}
              className={`
                w-full p-5 rounded-2xl border-3 text-left transition-all
                active:scale-[0.98]
                ${
                  hasDiagnosis === true
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white"
                }
              `}
            >
              <span className="text-xl font-medium text-foreground">
                네, 받았습니다
              </span>
            </button>
            <button
              onClick={() => onHasDiagnosisChange(false)}
              className={`
                w-full p-5 rounded-2xl border-3 text-left transition-all
                active:scale-[0.98]
                ${
                  hasDiagnosis === false
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white"
                }
              `}
            >
              <span className="text-xl font-medium text-foreground">
                아니요, 아직입니다
              </span>
            </button>
          </div>
        </div>

        {/* Conditional Inputs */}
        {hasDiagnosis === true && (
          <div className="space-y-5 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-lg font-medium text-foreground mb-3">
                진단받은 병명
              </label>
              <input
                type="text"
                value={diagnosisName}
                onChange={(e) => onDiagnosisNameChange(e.target.value)}
                placeholder="예: 소음성 난청, 추간판탈출증"
                className="w-full text-xl p-5 border-3 border-border rounded-2xl bg-white
                           focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-foreground mb-3">
                진단 병원명
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => onHospitalNameChange(e.target.value)}
                placeholder="예: 서울대학교병원"
                className="w-full text-xl p-5 border-3 border-border rounded-2xl bg-white
                           focus:border-primary focus:outline-none transition-colors"
              />
            </div>
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
