"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DISEASE_OPTIONS = [
  "뇌심혈관계 질환 (뇌출혈·심근경색 등)",
  "근골격계 질환 (허리·목·어깨 등)",
  "정신건강 질환 (우울증·공황장애·PTSD 등)",
  "직업성 암",
  "청력 손실 (소음성 난청)",
  "피부·호흡기 질환",
  "기타",
];

export default function AgentNewLeadPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    disease_name: "",
    disease_custom: "",
    referral_source: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 현재 사용자 프로필 조회 (역할 + 총판 여부 확인)
    const { data: profile } = await supabase
      .from("users")
      .select("role, parent_agent_id")
      .eq("id", user.id)
      .single();

    const diseaseName =
      form.disease_name === "기타" ? form.disease_custom.trim() : form.disease_name;

    if (!diseaseName) {
      setError("질환명을 입력해 주세요.");
      setLoading(false);
      return;
    }

    // master_agent_id 결정
    // - 하위영업자가 접수 → parent_agent_id (총판 id)
    // - 총판영업자가 직접 접수 → 자신의 id
    // - 관리자가 접수 → null
    let masterAgentId: string | null = null;
    if (profile?.role === "하위영업자" && profile.parent_agent_id) {
      masterAgentId = profile.parent_agent_id;
    } else if (profile?.role === "총판영업자") {
      masterAgentId = user.id;
    }

    const { error: insertError } = await supabase.from("leads").insert({
      customer_name:       form.customer_name.trim(),
      phone:               form.phone.trim(),
      disease_name:        diseaseName,
      referral_source:     form.referral_source.trim() || null,
      referred_by_user_id: user.id,
      master_agent_id:     masterAgentId,
      consultation_status: "신규",
    });

    if (insertError) {
      setError("접수 중 오류가 발생했습니다: " + insertError.message);
      setLoading(false);
      return;
    }

    setSavedName(form.customer_name.trim());
    setStep("done");
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      customer_name: "",
      phone: "",
      disease_name: "",
      disease_custom: "",
      referral_source: "",
    });
    setStep("form");
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">접수 완료!</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            <span className="font-semibold">{savedName}</span> 고객이 정상 접수됐습니다.
            <br />
            노무사가 검토 후 상태를 업데이트합니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={resetForm}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl"
          >
            추가 접수하기
          </button>
          <button
            onClick={() => router.back()}
            className="w-full border border-border text-foreground font-semibold py-4 rounded-2xl"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">신규 고객 접수</h1>
          <p className="text-xs text-muted-foreground">고객 정보를 입력하고 접수해 주세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="고객 이름" required>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="홍길동"
            className={inputCls}
          />
        </Field>

        <Field label="연락처" required>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="010-0000-0000"
            className={inputCls}
          />
        </Field>

        <Field label="주요 질환" required>
          <div className="grid grid-cols-1 gap-2">
            {DISEASE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set("disease_name", opt)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  form.disease_name === opt
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {form.disease_name === "기타" && (
            <input
              type="text"
              value={form.disease_custom}
              onChange={(e) => set("disease_custom", e.target.value)}
              placeholder="질환명 직접 입력"
              className={`${inputCls} mt-2`}
            />
          )}
        </Field>

        <Field label="유입 경로 메모" hint="(선택) 어떤 경로로 연락을 주셨는지 메모">
          <input
            type="text"
            value={form.referral_source}
            onChange={(e) => set("referral_source", e.target.value)}
            placeholder="예: 지인 소개, 네이버 광고 등"
            className={inputCls}
          />
        </Field>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !form.customer_name || !form.phone || !form.disease_name}
          className="w-full bg-primary text-white text-base font-bold py-4 rounded-2xl mt-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? "접수 중..." : "접수하기"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {hint && (
          <span className="text-xs text-muted-foreground font-normal ml-1">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}
