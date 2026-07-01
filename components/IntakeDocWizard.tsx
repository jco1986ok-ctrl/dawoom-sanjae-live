"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { uploadIntakeWizardFiles } from "@/lib/client-intake-doc-upload";
import { INTAKE_WIZARD_STEPS } from "@/lib/document-collection-catalog";
import { saveIntakeWizardProgress } from "@/lib/intake-session-storage";

function FixedCTA({
  label,
  disabled,
  onClick,
  hint,
  variant = "primary",
  enhancedShadow = false,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  hint?: string;
  variant?: "primary" | "ghost";
  enhancedShadow?: boolean;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      <div className="h-10 bg-gradient-to-t from-white via-white/95 to-transparent" />
      <div className="bg-white px-5 pb-9 pt-1 pointer-events-auto border-t border-[#F2F4F6]/80 flex flex-col items-center gap-2">
        {hint && (
          <p className="text-[13px] text-[#8B95A1] tracking-[-0.02em] text-center w-full">{hint}</p>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`w-full py-4 rounded-2xl font-bold text-[17px] tracking-[-0.02em] transition-all active:scale-[0.98] ${
            variant === "ghost"
              ? "bg-transparent text-[#8B95A1] hover:text-[#3182F6] disabled:opacity-40"
              : disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : enhancedShadow
                  ? "bg-[#3182F6] text-white shadow-[0_6px_24px_rgba(49,130,246,0.55)] ring-2 ring-[#3182F6]/30"
                  : "bg-[#3182F6] text-white shadow-[0_4px_16px_rgba(49,130,246,0.35)]"
          }`}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

type Step1UploadPreview = {
  fileName: string;
  previewUrl: string | null;
};

export function IntakeFinishedScreen({
  onGoHome,
  onNewIntake,
}: {
  onGoHome: () => void;
  onNewIntake: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-44 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-full bg-[#E8F3FF] flex items-center justify-center text-5xl mb-6"
        >
          🎉
        </motion.div>
        <h1 className="text-[24px] font-bold text-[#191F28] tracking-[-0.03em] mb-3 leading-[1.4]">
          수고하셨습니다!
        </h1>
        <p className="text-[15px] text-[#8B95A1] leading-[1.65] tracking-[-0.02em]">
          담당 노무사가 곧 연락드립니다.
          <br />
          추가 서류는 나중에 카카오톡으로 보내주셔도 됩니다.
        </p>
        <button
          type="button"
          onClick={onNewIntake}
          className="mt-8 text-[13px] text-[#8B95A1] underline underline-offset-2"
        >
          🔄 본인이 아니신가요? 새로 접수하기
        </button>
      </main>
      <FixedCTA label="홈으로 돌아가기" onClick={onGoHome} />
    </div>
  );
}

export function IntakeDocWizard({
  leadId,
  uploadToken,
  initialStep = 1,
  onFinished,
  onNewIntake,
}: {
  leadId: string;
  uploadToken: string | null;
  initialStep?: 1 | 2 | 3;
  onFinished: () => void;
  onNewIntake: () => void;
}) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(initialStep);
  const [uploading, setUploading] = useState(false);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [step1Upload, setStep1Upload] = useState<Step1UploadPreview | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepDef = INTAKE_WIZARD_STEPS.find((s) => s.step === wizardStep)!;
  const canUpload = Boolean(leadId && uploadToken);
  const progressPercent = Math.round(((wizardStep - 1) / 3) * 100);
  const isStep1 = wizardStep === 1;
  const step1Complete = Boolean(step1Upload);

  useEffect(() => {
    return () => {
      if (step1Upload?.previewUrl) {
        URL.revokeObjectURL(step1Upload.previewUrl);
      }
    };
  }, [step1Upload?.previewUrl]);

  const goNextStep = () => {
    if (wizardStep >= 3) {
      saveIntakeWizardProgress(3, true);
      onFinished();
      return;
    }
    const next = (wizardStep + 1) as 1 | 2 | 3;
    saveIntakeWizardProgress(next, false);
    setWizardStep(next);
  };

  const handleSkip = () => {
    if (uploading) return;
    goNextStep();
  };

  const handlePickCamera = () => {
    if (!canUpload || uploading) return;
    cameraInputRef.current?.click();
  };

  const handlePickFiles = () => {
    if (!canUpload || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length === 0 || !leadId || !uploadToken) return;

    setUploading(true);
    try {
      const result = await uploadIntakeWizardFiles(leadId, uploadToken, wizardStep, picked);
      if (!result.success) {
        toast.error(result.error ?? "서류 업로드에 실패했습니다.");
        return;
      }
      const names = (result.uploaded ?? []).map((f) => f.fileName);
      setUploadedNames((prev) => [...prev, ...names]);
      toast.success("✅ 서류 첨부가 완료되었습니다!");

      if (isStep1) {
        const file = picked[0];
        setStep1Upload((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
          const previewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null;
          return { fileName: names[0] ?? file.name, previewUrl };
        });
      } else {
        goNextStep();
      }
    } catch (err) {
      console.error("[IntakeDocWizard]", err);
      toast.error("서류 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const ctaHint = isStep1
    ? step1Complete
      ? "신분증 첨부 완료! 아래 버튼을 눌러 다음 단계로 진행해 주세요."
      : "촬영 또는 파일 선택 후 [다음 단계로]를 눌러 주세요. 건너뛰어도 됩니다."
    : stepDef.multi
      ? "여러 장을 한 번에 선택할 수 있습니다."
      : undefined;

  return (
    <div className="flex flex-col h-full bg-white">
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-52">
        <div className="mb-5">
          <p className="text-[12px] font-bold text-[#3182F6] mb-1">
            서류 첨부 {wizardStep} / 3
          </p>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#3182F6] transition-all duration-500"
              style={{ width: `${progressPercent + 33}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-5">
          <p className="text-[14px] font-bold text-emerald-900">
            ✅ 산재 접수 및 위임 계약이 완료되었습니다!
          </p>
          <p className="text-[12px] text-emerald-800/80 mt-1 leading-relaxed">
            이어서 서류를 올려 주시면 검토가 더 빨라집니다. 없으면 건너뛰셔도 됩니다.
          </p>
        </div>

        <h1 className="text-[22px] font-bold text-[#191F28] tracking-[-0.03em] mb-2">
          {stepDef.title}
        </h1>
        <p className="text-[14px] text-[#8B95A1] leading-[1.65] mb-5">{stepDef.description}</p>

        {!isStep1 && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 mb-5">
            <p className="text-[14px] text-[#191F28] leading-[1.65] whitespace-pre-line">
              💡 진단서나 의무기록지가 있으신가요?{"\n"}
              추가 서류를 첨부해 주시면, 더욱 정확한 예상 보상금 환산과 빠른 사건 검토가
              가능합니다.
            </p>
          </div>
        )}

        {isStep1 ? (
          <>
            <p className="text-[12px] text-[#8B95A1] leading-relaxed mb-4 text-center">
              💡 빛 반사가 없도록 어두운 배경에서 촬영해 주시면 좋습니다.
            </p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleFilesSelected}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleFilesSelected}
            />

            <button
              type="button"
              onClick={handlePickCamera}
              disabled={!canUpload || uploading}
              className={`w-full py-4 rounded-2xl font-bold text-[16px] transition-all mb-3 active:scale-[0.98] ${
                !canUpload || uploading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#3182F6] text-white shadow-[0_4px_16px_rgba(49,130,246,0.35)] hover:bg-[#2563EB]"
              }`}
            >
              {uploading ? "업로드 중…" : "📸 스마트폰 카메라로 바로 촬영하기"}
            </button>

            <button
              type="button"
              onClick={handlePickFiles}
              disabled={!canUpload || uploading}
              className={`w-full py-4 rounded-2xl font-bold text-[16px] border-2 transition-all mb-3 active:scale-[0.98] ${
                !canUpload || uploading
                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "border-[#3182F6]/40 bg-white text-[#3182F6] hover:bg-[#F0F6FF]"
              }`}
            >
              📂 앨범/파일에서 선택하기
            </button>

            {step1Complete && step1Upload && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 mb-3"
              >
                <p className="text-[14px] font-bold text-emerald-800 mb-3">
                  ✅ 신분증 첨부 완료
                </p>
                <div className="flex items-center gap-3 min-w-0">
                  {step1Upload.previewUrl ? (
                    <img
                      src={step1Upload.previewUrl}
                      alt="신분증 미리보기"
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-2xl shrink-0">
                      📄
                    </div>
                  )}
                  <p className="text-[13px] text-emerald-900 break-all min-w-0">
                    {step1Upload.fileName}
                  </p>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple={stepDef.multi}
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleFilesSelected}
            />

            <button
              type="button"
              onClick={handlePickFiles}
              disabled={!canUpload || uploading}
              className={`w-full py-4 rounded-2xl font-bold text-[16px] border-2 transition-all mb-3 ${
                !canUpload || uploading
                  ? "border-gray-200 bg-gray-50 text-gray-400"
                  : "border-[#3182F6]/30 bg-white text-[#3182F6] hover:bg-[#F0F6FF]"
              }`}
            >
              {uploading ? "업로드 중…" : "📂 파일 선택해서 업로드하기"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleSkip}
          disabled={uploading}
          className="w-full py-3 text-[14px] font-semibold text-[#8B95A1] hover:text-[#3182F6] transition-colors"
        >
          건너뛰기 (나중에 첨부하기)
        </button>

        {!canUpload && (
          <p className="text-[12px] text-[#8B95A1] text-center mt-4">
            접수 정보를 불러올 수 없어 업로드가 제한됩니다. 담당 노무사에게 전달해 주세요.
          </p>
        )}

        {!isStep1 && uploadedNames.length > 0 && (
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-[13px] font-bold text-emerald-800 mb-2">이번에 첨부한 서류</p>
            <ul className="space-y-1">
              {uploadedNames.map((name, i) => (
                <li key={`${name}-${i}`} className="text-[13px] text-emerald-900 break-all">
                  📄 {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onNewIntake}
          className="w-full text-center text-[13px] text-[#8B95A1] underline mt-6 py-2"
        >
          🔄 본인이 아니신가요? 새로 접수하기
        </button>
      </main>

      <FixedCTA
        label={wizardStep < 3 ? "다음 단계로" : "완료하기"}
        onClick={handleSkip}
        disabled={uploading}
        hint={ctaHint}
        enhancedShadow={isStep1 && step1Complete}
      />
    </div>
  );
}
