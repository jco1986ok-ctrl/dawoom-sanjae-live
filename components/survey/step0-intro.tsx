"use client";

import { FileCheck, ClipboardCheck } from "lucide-react";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";

interface Step0IntroProps {
  onNext: () => void;
}

const COMPANY_NAME = "노무법인 파로스";

export function Step0Intro({ onNext }: Step0IntroProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <header className="bg-primary px-6 py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-transparent shrink-0">
            <ParoLogo size={72} priority className="w-14 h-14 sm:w-16 sm:h-16 bg-transparent" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">{COMPANY_NAME}</span>
          <span className="text-blue-100/90 text-sm text-center">{PARO_GREETING}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col">
        {/* Main Copy */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
            몰라서 놓치고 있는
            <br />
            산재 보상금,
            <br />
            <span className="text-primary">혹시 나도 대상자일까?</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            1분 만에 나의 산재 승인 가능성을
            <br />
            무료로 확인해 보세요.
            <br />
            <strong className="text-foreground">{COMPANY_NAME} 전문 노무사가 직접 검토해 드립니다.</strong>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-secondary rounded-2xl p-5 flex flex-col items-center text-center">
            <FileCheck className="w-10 h-10 text-primary mb-3" />
            <span className="text-2xl font-bold text-foreground">5,000+</span>
            <span className="text-lg text-muted-foreground">누적 상담 건수</span>
          </div>
          <div className="bg-secondary rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="bg-transparent shrink-0 mb-3">
              <ParoLogo size={40} className="w-10 h-10 bg-transparent" />
            </div>
            <span className="text-lg font-bold text-foreground">철저한</span>
            <span className="text-lg text-muted-foreground">비밀 보장</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 bg-white border-2 border-border rounded-xl p-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">1분 무료 웹 진단</p>
              <p className="text-base text-muted-foreground">폼 접수만으로 간편하게 확인</p>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA Button */}
        <button
          onClick={onNext}
          className="w-full bg-primary text-white text-2xl font-bold py-6 rounded-2xl 
                     active:scale-[0.98] transition-transform shadow-lg"
        >
          1분 자가진단 시작하기
        </button>
      </main>
    </div>
  );
}
