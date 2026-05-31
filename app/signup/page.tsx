import { Suspense } from "react";
import SignupForm from "./SignupForm";

function SignupFormFallback() {
  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4 py-12">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">회원가입 페이지를 불러오는 중...</p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background flex flex-col items-center justify-center px-6 py-10">
      <Suspense fallback={<SignupFormFallback />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
