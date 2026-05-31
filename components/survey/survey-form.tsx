"use client";

import { useState } from "react";
import { Step0Intro } from "./step0-intro";
import { Step1Category, type DiseaseCategory } from "./step1-category";
import { Step2DynamicQuestion } from "./step2-dynamic-question";
import { Step3Diagnosis } from "./step3-diagnosis";
import { Step4CompanyStatus } from "./step4-company-status";
import { Step5SelfAwareness } from "./step5-self-awareness";
import { Step6Contact } from "./step6-contact";

type CurrentStatus = "working" | "considering-leave" | "considering-quit" | "already-left" | null;
type CompanyAwareness = "informed" | "not-informed" | null;
type SanjaeDiscussion = "discussed" | "not-discussed" | null;
type WorkRelation = "work-related" | "not-sure" | "not-related" | null;
type SanjaeIntent = "yes" | "considering" | "not-sure" | "no" | null;

interface FormData {
  category: DiseaseCategory;
  dynamicAnswer: boolean | null;
  workYears: string;
  hasDiagnosis: boolean | null;
  diagnosisName: string;
  hospitalName: string;
  currentStatus: CurrentStatus;
  companyAwareness: CompanyAwareness;
  sanjaeDiscussion: SanjaeDiscussion;
  companyReaction: string;
  workRelation: WorkRelation;
  sanjaeIntent: SanjaeIntent;
  additionalComment: string;
  name: string;
  phone: string;
  age: string;
  job: string;
}

const initialFormData: FormData = {
  category: null,
  dynamicAnswer: null,
  workYears: "",
  hasDiagnosis: null,
  diagnosisName: "",
  hospitalName: "",
  currentStatus: null,
  companyAwareness: null,
  sanjaeDiscussion: null,
  companyReaction: "",
  workRelation: null,
  sanjaeIntent: null,
  additionalComment: "",
  name: "",
  phone: "",
  age: "",
  job: "",
};

export function SurveyForm({ onBack }: { onBack?: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const goNext = () => {
    setStep((s) => Math.min(s + 1, 6));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (step === 1 && onBack) {
      onBack();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // URL ?ref= 파라미터에서 레퍼럴 코드 추출
    const refCode =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref")
        : null;

    try {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              formData.name,
          phone:             formData.phone,
          age:               formData.age,
          job:               formData.job,
          category:          formData.category,
          diagnosisName:     formData.diagnosisName,
          workYears:         formData.workYears,
          hasDiagnosis:      formData.hasDiagnosis,
          hospitalName:      formData.hospitalName,
          currentStatus:     formData.currentStatus,
          companyAwareness:  formData.companyAwareness,
          sanjaeDiscussion:  formData.sanjaeDiscussion,
          companyReaction:   formData.companyReaction,
          workRelation:      formData.workRelation,
          sanjaeIntent:      formData.sanjaeIntent,
          additionalComment: formData.additionalComment,
          refCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 디버깅을 위해 debug 정보가 있으면 콘솔에 출력
        if (result.debug) {
          console.error("[form] 서버 디버그 정보:", result.debug);
        }
        const errorMsg = result.error ?? "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        setSubmitError(errorMsg);
      } else {
        setSubmitSuccess(true);
      }
    } catch (networkErr) {
      console.error("[form] 네트워크 오류:", networkErr);
      setSubmitError(
        "네트워크 오류가 발생했습니다.\n인터넷 연결을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSubmitSuccess(false);
    setSubmitError(null);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {step === 0 && <Step0Intro onNext={goNext} />}

      {step === 1 && (
        <Step1Category
          selectedCategory={formData.category}
          onSelect={(category) => updateFormData("category", category)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {step === 2 && (
        <Step2DynamicQuestion
          category={formData.category}
          answer={formData.dynamicAnswer}
          onAnswer={(answer) => updateFormData("dynamicAnswer", answer)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {step === 3 && (
        <Step3Diagnosis
          workYears={formData.workYears}
          hasDiagnosis={formData.hasDiagnosis}
          diagnosisName={formData.diagnosisName}
          hospitalName={formData.hospitalName}
          onWorkYearsChange={(v) => updateFormData("workYears", v)}
          onHasDiagnosisChange={(v) => updateFormData("hasDiagnosis", v)}
          onDiagnosisNameChange={(v) => updateFormData("diagnosisName", v)}
          onHospitalNameChange={(v) => updateFormData("hospitalName", v)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {step === 4 && (
        <Step4CompanyStatus
          currentStatus={formData.currentStatus}
          companyAwareness={formData.companyAwareness}
          sanjaeDiscussion={formData.sanjaeDiscussion}
          companyReaction={formData.companyReaction}
          onCurrentStatusChange={(v) => updateFormData("currentStatus", v)}
          onCompanyAwarenessChange={(v) => updateFormData("companyAwareness", v)}
          onSanjaeDiscussionChange={(v) => updateFormData("sanjaeDiscussion", v)}
          onCompanyReactionChange={(v) => updateFormData("companyReaction", v)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {step === 5 && (
        <Step5SelfAwareness
          workRelation={formData.workRelation}
          sanjaeIntent={formData.sanjaeIntent}
          additionalComment={formData.additionalComment}
          onWorkRelationChange={(v) => updateFormData("workRelation", v)}
          onSanjaeIntentChange={(v) => updateFormData("sanjaeIntent", v)}
          onAdditionalCommentChange={(v) => updateFormData("additionalComment", v)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {step === 6 && (
        <Step6Contact
          name={formData.name}
          phone={formData.phone}
          age={formData.age}
          job={formData.job}
          onNameChange={(v) => updateFormData("name", v)}
          onPhoneChange={(v) => updateFormData("phone", v)}
          onAgeChange={(v) => updateFormData("age", v)}
          onJobChange={(v) => updateFormData("job", v)}
          onPrev={goPrev}
          onSubmit={handleSubmit}
          onReset={handleReset}
          isSubmitting={isSubmitting}
          submitError={submitError}
          submitSuccess={submitSuccess}
        />
      )}
    </div>
  );
}
