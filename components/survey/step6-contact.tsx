"use client";

import { ChevronLeft, CheckCircle2, Circle, Loader2, AlertCircle, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";

const COMPANY_NAME = "노무법인 파로스";

// ── 약관 정의 ────────────────────────────────────────────────
const TERMS = [
  {
    id: "privacy",
    required: true,
    title: "개인정보 수집 및 이용 동의",
    content: `■ 수집하는 개인정보 항목
이름, 연락처(휴대폰 번호), 나이, 직업 및 업종

■ 수집 및 이용 목적
산재 보상 관련 무료 상담 서비스 제공, 상담 결과 안내 및 후속 서비스 연락

■ 보유 및 이용 기간
상담 완료 후 1년간 보유 후 파기.
단, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관됩니다.

■ 동의 거부 시 불이익
개인정보 수집 및 이용에 동의하지 않으실 수 있습니다. 다만, 동의를 거부하실 경우 산재 상담 서비스를 받으실 수 없습니다.`,
  },
  {
    id: "sensitive",
    required: true,
    title: "고유식별정보 및 민감정보(건강/질병) 처리 동의",
    content: `■ 처리하는 민감정보 항목
건강 상태, 질병명, 진단 여부, 병원 정보, 근무 이력 등 건강·질병 관련 정보

■ 처리 목적
산업재해 승인 가능성 검토 및 맞춤형 상담 서비스 제공

■ 보유 및 이용 기간
상담 완료 후 1년간 보유 후 파기

■ 동의 거부 시 불이익
민감정보 처리에 동의하지 않으실 수 있습니다. 다만, 동의를 거부하실 경우 산재 상담 서비스 제공이 불가합니다.

※ 본 정보는 산재 상담 외의 목적으로 사용되지 않습니다.`,
  },
  {
    id: "thirdparty",
    required: true,
    title: `개인정보 제3자 제공 동의 (${COMPANY_NAME})`,
    content: `■ 제공받는 자
노무법인 파로스 (담당 노무사)

■ 제공하는 개인정보 항목
이름, 연락처, 나이, 직업, 질병 정보, 근무 이력 등 상담에 필요한 정보

■ 제공 목적
산재 승인 가능성 검토 및 전문 노무사의 직접 상담 연결

■ 보유 및 이용 기간
상담 완료 후 1년

■ 동의 거부 시 불이익
동의를 거부하실 수 있으며, 거부 시 전문 노무사 상담 연결이 불가합니다.`,
  },
  {
    id: "marketing",
    required: false,
    title: "마케팅 활용 및 광고성 정보 수신 동의",
    content: `■ 수신 동의 항목
SMS, 카카오톡 메시지 등을 통한 산재 관련 정보 및 노무법인 파로스의 서비스 안내

■ 활용 목적
산재 보상 제도 변경 안내, 관련 판례 및 유용한 정보 전달, 서비스 이용 만족도 조사

■ 수신 거부 방법
수신 거부를 원하실 경우 cpla9585@nomupharos.com 으로 연락하시거나 수신된 메시지에서 수신거부 처리가 가능합니다.

■ 동의 거부 시 불이익
마케팅 정보 수신에 동의하지 않으셔도 기본 상담 서비스 이용에는 제한이 없습니다.`,
  },
] as const;

type TermId = (typeof TERMS)[number]["id"];

// ── Props ────────────────────────────────────────────────────
interface Step6ContactProps {
  name: string;
  phone: string;
  age: string;
  job: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onJobChange: (value: string) => void;
  onPrev: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  submitSuccess?: boolean;
}

export function Step6Contact({
  name, phone, age, job,
  onNameChange, onPhoneChange, onAgeChange, onJobChange,
  onPrev, onSubmit, onReset,
  isSubmitting = false,
  submitError = null,
  submitSuccess = false,
}: Step6ContactProps) {
  const [checked, setChecked] = useState<Record<TermId, boolean>>({
    privacy: false, sensitive: false, thirdparty: false, marketing: false,
  });
  const [modalTerm, setModalTerm] = useState<(typeof TERMS)[number] | null>(null);

  const requiredIds = TERMS.filter((t) => t.required).map((t) => t.id);
  const allRequiredChecked = requiredIds.every((id) => checked[id]);
  const allChecked = TERMS.every((t) => checked[t.id]);

  const toggle = (id: TermId) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ privacy: next, sensitive: next, thirdparty: next, marketing: next });
  };

  const canSubmit = name.trim() && phone.trim() && age.trim() && job.trim() && allRequiredChecked && !isSubmitting;

  // ── 성공 화면 ─────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center w-full max-w-sm">
          <div className="bg-transparent shrink-0 mx-auto mb-4">
            <ParoLogo size={80} priority className="w-16 h-16 sm:w-20 sm:h-20 bg-transparent mx-auto" />
          </div>
          <p className="text-lg text-primary font-bold mb-2">{COMPANY_NAME}</p>
          <p className="text-sm text-muted-foreground mb-6">{PARO_GREETING}</p>
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-14 h-14 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">접수 완료!</h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-2">접수가 완료되었습니다.</p>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            전문 노무사가 검토 후 빠른 시일 내에
            <br />
            <span className="font-bold text-foreground">{phone}</span>으로
            <br />
            직접 연락드리겠습니다.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-8 text-left">
            <p className="text-sm font-semibold text-primary mb-2">접수 확인</p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>· 신청자: <strong className="text-foreground">{name}</strong></span>
              <span>· 연락처: <strong className="text-foreground">{phone}</strong></span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">급하신 경우 아래 번호로 직접 연락주세요.</p>
            <p className="text-base font-bold text-primary mt-1">📞 1588-0000</p>
          </div>
          <button
            onClick={onReset}
            className="w-full bg-primary text-white text-xl font-bold py-5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            처음으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── 입력 폼 ─────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-primary px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={onPrev} disabled={isSubmitting} className="text-white p-2 -ml-2 active:opacity-70 disabled:opacity-40" aria-label="이전으로">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <span className="text-white text-lg font-medium">6 / 6</span>
            <div className="w-12" />
          </div>
        </header>

        <main className="flex-1 px-6 py-6 flex flex-col overflow-y-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">수고하셨습니다!</h1>
          <p className="text-lg text-muted-foreground mb-6">
            {COMPANY_NAME} 노무사가 검토 후 연락드릴 연락처를 남겨주세요.
          </p>

          {/* 에러 메시지 */}
          {submitError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-600 mb-0.5">접수 실패</p>
                <p className="text-sm text-red-500 whitespace-pre-line">{submitError}</p>
                <p className="text-xs text-red-400 mt-1">아래 [무료 상담 신청] 버튼을 다시 눌러주세요.</p>
              </div>
            </div>
          )}

          {/* 입력 필드 */}
          <div className="space-y-4 mb-8">
            {[
              { label: "이름", value: name, onChange: onNameChange, placeholder: "예: 홍길동", type: "text", inputMode: undefined },
              { label: "연락처 (숫자만)", value: phone, onChange: (v: string) => onPhoneChange(v.replace(/[^0-9]/g, "")), placeholder: "예: 01012345678", type: "text", inputMode: "numeric" as const },
              { label: "나이", value: age, onChange: onAgeChange, placeholder: "예: 58", type: "text", inputMode: "numeric" as const },
              { label: "직업 및 업종", value: job, onChange: onJobChange, placeholder: "예: 건설현장 용접공", type: "text", inputMode: undefined },
            ].map(({ label, value, onChange, placeholder, type, inputMode }) => (
              <div key={label}>
                <label className="block text-lg font-medium text-foreground mb-2">{label}</label>
                <input
                  type={type}
                  inputMode={inputMode}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  disabled={isSubmitting}
                  className="w-full text-xl p-4 border-2 border-border rounded-xl bg-white
                             focus:border-primary focus:outline-none transition-colors
                             disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
          </div>

          {/* ── 약관 동의 영역 ── */}
          <div className="rounded-2xl border-2 border-border overflow-hidden mb-6">

            {/* 전체 동의 */}
            <button
              type="button"
              onClick={toggleAll}
              disabled={isSubmitting}
              className="w-full flex items-center gap-4 px-5 py-5 bg-primary/5 border-b-2 border-border active:bg-primary/10 transition-colors disabled:opacity-40"
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-colors ${allChecked ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}>
                {allChecked && <svg viewBox="0 0 12 10" className="w-4 h-4" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span className="text-lg font-bold text-foreground text-left">약관 전체 동의하기</span>
            </button>

            {/* 개별 약관 항목 */}
            <div className="divide-y divide-border">
              {TERMS.map((term) => (
                <div key={term.id} className="flex items-center px-5 py-4 gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(term.id)}
                    disabled={isSubmitting}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:opacity-40"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-colors ${checked[term.id] ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}>
                      {checked[term.id] && <svg viewBox="0 0 12 10" className="w-3.5 h-3.5" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-slate-400 font-semibold leading-none">
                        {term.required ? "필수" : "선택"}
                      </span>
                      <span className="text-base font-medium text-foreground leading-snug">
                        {term.title}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTerm(term)}
                    className="flex items-center gap-0.5 text-sm text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0 hover:text-slate-600 hover:border-slate-300 transition-colors"
                  >
                    보기 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* 필수 항목 미동의 경고 */}
            {!allRequiredChecked && (name.trim() || phone.trim()) && (
              <div className="px-5 py-3 bg-red-50 border-t border-red-100">
                <p className="text-sm text-red-500 font-medium">필수 약관 3개에 모두 동의해야 신청이 가능합니다.</p>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[20px]" />

          {/* 버튼 영역 */}
          <div className="flex gap-4 pt-2 pb-2">
            <button
              onClick={onPrev}
              disabled={isSubmitting}
              className="flex-1 bg-secondary text-foreground text-xl font-bold py-5 rounded-2xl active:scale-[0.98] disabled:opacity-40"
            >
              이전
            </button>
            <button
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              className={`flex-[2] text-xl font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                canSubmit ? "bg-primary text-white active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin" />접수 중...</>
              ) : "무료 상담 신청"}
            </button>
          </div>
        </main>
      </div>

      {/* ── 약관 상세 모달 ── */}
      {modalTerm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModalTerm(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${modalTerm.required ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>
                  {modalTerm.required ? "필수" : "선택"}
                </span>
                <h2 className="text-base font-bold text-slate-800 mt-1.5 leading-snug">{modalTerm.title}</h2>
              </div>
              <button onClick={() => setModalTerm(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <pre className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
                {modalTerm.content}
              </pre>
            </div>

            {/* 모달 버튼 */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setModalTerm(null)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3.5 rounded-2xl text-base"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setChecked((prev) => ({ ...prev, [modalTerm.id]: true }));
                  setModalTerm(null);
                }}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl text-base"
              >
                동의하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
