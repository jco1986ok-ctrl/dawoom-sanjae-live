"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Sparkles } from "lucide-react";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";
import { toast } from "sonner";
import { partnerSignupAction, type PartnerSignupResult } from "./actions";
import { resolvePartnerInviteCode } from "@/lib/partner-signup";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = resolvePartnerInviteCode(
    searchParams.get("invite"),
    searchParams.get("ref"),
  );

  const [state, formAction, pending] = useActionState<PartnerSignupResult | null, FormData>(
    partnerSignupAction,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message, {
        description: `파트너 코드: ${state.agentId}`,
      });
      router.push("/login");
    }
  }, [state, router]);

  if (!inviteCode) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        초대 링크에 파트너 코드가 없습니다. 초대한 파트너에게 링크를 다시 요청해 주세요.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-transparent shrink-0 mb-4">
          <ParoLogo variant="dashboard" size={80} />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center leading-snug">
          파로스 노무법인 VIP 제휴 파트너 회원가입
        </h1>
        <p className="text-sm text-muted-foreground mt-2 text-center">{PARO_GREETING}</p>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          초대 코드 <span className="font-mono font-semibold text-primary">{inviteCode}</span>로
          <br />
          제휴 멤버 계정을 만듭니다
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-900">
          가입 즉시 <strong>제휴 멤버</strong> 권한이 부여되며, 전용 파트너 코드와 고객 접수 링크가
          자동 생성됩니다. 등급 승격은 가입 후 상위 관리자가 대시보드에서 진행합니다.
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="invite" value={inviteCode} />
        <input type="hidden" name="ref" value={inviteCode} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="홍길동"
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="partner@example.com"
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="8자 이상"
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="비밀번호를 다시 입력"
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {state && !state.success && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-primary text-white text-base font-bold py-4 rounded-2xl mt-2 active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          {pending ? "가입 처리 중..." : "제휴 파트너 가입하기"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        이미 계정이 있으신가요?{" "}
        <a href="/login" className="text-primary font-semibold hover:underline">
          로그인
        </a>
      </p>
    </div>
  );
}
