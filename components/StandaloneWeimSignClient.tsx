"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import ParoLogo from "@/components/ParoLogo";
import SignaturePadField, { type SignaturePadHandle } from "@/components/SignaturePadField";
import {
  WeimSignCustomerInfoForm,
  type WeimSignCustomerInfoFormValue,
} from "@/components/WeimSignCustomerInfoForm";
import {
  AddressSearchBottomSheet,
  type AddressSearchResult,
} from "@/components/AddressSearchBottomSheet";
import type { WeimCustomerInfoInput } from "@/lib/merge-lead-weim-info";

type Step = "loading" | "info" | "sign" | "not_found" | "already_signed" | "success" | "error";

function WeimBrandHeader() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <ParoLogo size={16} />
      <span className="text-[12px] font-semibold text-[#8B95A1] tracking-wider">
        질병산재 전문 노무법인 파로스
      </span>
    </div>
  );
}

export function StandaloneWeimSignClient({ leadId }: { leadId: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [customerName, setCustomerName] = useState("");
  const [prefillAddress, setPrefillAddress] = useState<string | undefined>();
  const [customerInfo, setCustomerInfo] = useState<WeimCustomerInfoInput | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const addressPickRef = useRef<(result: AddressSearchResult) => void>(() => {});
  const bindAddressPick = useCallback((pick: (result: AddressSearchResult) => void) => {
    addressPickRef.current = pick;
  }, []);
  const sigRef = useRef<SignaturePadHandle>(null);

  const loadState = useCallback(async () => {
    setStep("loading");
    try {
      const res = await fetch(`/api/sign/${leadId}`);
      const data = (await res.json()) as {
        status?: string;
        customerName?: string;
        needsInfo?: boolean;
        prefill?: { address?: string };
        error?: string;
      };

      if (!res.ok || data.status === "not_found") {
        setStep("not_found");
        return;
      }

      if (data.status === "already_signed") {
        setCustomerName(data.customerName ?? "");
        setStep("already_signed");
        return;
      }

      if (data.status === "ready" && data.customerName) {
        setCustomerName(data.customerName);
        setPrefillAddress(data.prefill?.address);
        setCustomerInfo(null);
        setStep(data.needsInfo ? "info" : "sign");
        return;
      }

      setStep("not_found");
    } catch {
      setErrorMessage("정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setStep("error");
    }
  }, [leadId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleInfoSubmit = (value: WeimSignCustomerInfoFormValue) => {
    setCustomerInfo(value);
    setStep("sign");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const signature = sigRef.current?.getSignatureDataUrl();
    if (!signature) return;

    setSubmitting(true);
    try {
      const body: { existingLeadId: string; signature: string; customerInfo?: WeimCustomerInfoInput } =
        {
          existingLeadId: leadId,
          signature,
        };
      if (customerInfo) {
        body.customerInfo = customerInfo;
      }

      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        if (res.status === 409) {
          setStep("already_signed");
          return;
        }
        setErrorMessage(data.error ?? "서명 처리 중 오류가 발생했습니다.");
        setStep("error");
        return;
      }

      setStep("success");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#3182F6]" />
        <p className="text-sm">정보를 불러오는 중…</p>
      </div>
    );
  }

  if (step === "not_found") {
    return (
      <StatusCard
        title="링크를 확인해 주세요"
        description="유효하지 않은 위임장 서명 링크입니다. 담당자에게 다시 요청해 주세요."
        tone="warn"
      />
    );
  }

  if (step === "already_signed") {
    return (
      <StatusCard
        title="이미 위임장 서명이 완료된 고객입니다."
        description={
          customerName
            ? `${customerName} 님의 위임장은 이미 접수되어 있습니다.`
            : "추가 서명이 필요하지 않습니다."
        }
        tone="info"
      />
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h1 className="text-[22px] font-bold text-[#191F28] tracking-[-0.03em]">
          ✅ 위임장 서명이 완료되었습니다!
        </h1>
        <p className="text-[14px] text-[#8B95A1] mt-3 leading-relaxed">
          담당 노무사가 확인 후 다음 절차를 안내드리겠습니다.
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <StatusCard
        title="오류가 발생했습니다"
        description={errorMessage}
        tone="warn"
        actionLabel="다시 시도"
        onAction={() => void loadState()}
      />
    );
  }

  if (step === "info") {
    return (
      <>
        <header className="px-5 pt-5 pb-2 max-w-md mx-auto">
          <WeimBrandHeader />
        </header>
        <WeimSignCustomerInfoForm
          customerName={customerName}
          prefillAddress={prefillAddress}
          onSubmit={handleInfoSubmit}
          onAddressSearch={() => setPostcodeOpen(true)}
          onBindAddressPick={bindAddressPick}
        />
        <AddressSearchBottomSheet
          open={postcodeOpen}
          onClose={() => setPostcodeOpen(false)}
          onComplete={(result) => addressPickRef.current(result)}
        />
      </>
    );
  }

  const displayName = customerName.trim() || "고객";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="px-5 pt-5 pb-2">
        <WeimBrandHeader />
      </header>

      <main className="flex-1 px-5 pt-4 pb-32">
        <h1 className="text-[22px] font-bold text-[#191F28] leading-[1.45] tracking-[-0.03em]">
          안녕하세요 {displayName}님,
        </h1>
        <p className="text-[15px] text-[#8B95A1] mt-2 leading-relaxed tracking-[-0.02em]">
          산재 접수를 위한 위임장에 서명해 주세요.
        </p>
        <p className="text-[13px] text-[#8B95A1] mt-4 leading-relaxed">
          아래 칸에 정자로 서명하신 뒤 [서명 완료]를 눌러 주시면 위임장·선임·약정서 PDF가
          자동으로 생성됩니다.
        </p>

        {customerInfo && (
          <button
            type="button"
            onClick={() => setStep("info")}
            className="mt-3 text-[13px] font-semibold text-[#3182F6] underline underline-offset-2"
          >
            입력 정보 수정
          </button>
        )}

        <div className="mt-6">
          <SignaturePadField
            ref={sigRef}
            heightClass="h-52"
            watermark="여기에 정자로 서명해 주세요"
            onSignatureChange={setHasSignature}
          />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-auto">
          <button
            type="button"
            disabled={!hasSignature || submitting}
            onClick={() => void handleSubmit()}
            className="w-full bg-[#3182F6] text-white font-bold text-[16px] py-4 rounded-2xl active:scale-[0.98] shadow-lg shadow-[#3182F6]/25 transition-transform tracking-[-0.02em] disabled:opacity-45 disabled:shadow-none"
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                처리 중…
              </span>
            ) : (
              "서명 완료"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  description,
  tone,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  tone: "info" | "warn";
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          tone === "info" ? "bg-blue-50 text-[#3182F6]" : "bg-amber-50 text-amber-600"
        }`}
      >
        {tone === "info" ? "✓" : "!"}
      </div>
      <h1 className="text-[20px] font-bold text-[#191F28] tracking-[-0.02em]">{title}</h1>
      <p className="text-[14px] text-[#8B95A1] mt-3 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
