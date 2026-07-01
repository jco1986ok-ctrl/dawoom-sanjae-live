"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import LandingPage from "@/components/LandingPage";
import { canResumeFromLanding } from "@/lib/intake-session-storage";

const DynamicForm = dynamic(() => import("@/components/DynamicForm"), {
  ssr: false,
  loading: () => <FormFallback />,
});

interface Props {
  referralCode: string | null;
  partnerName: string | null;
}

function FormFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-[#8B95A1]">설문을 불러오는 중…</p>
    </div>
  );
}

export default function HomeClient({ referralCode, partnerName }: Props) {
  const [started, setStarted] = useState(false);
  const [canResumeIntake, setCanResumeIntake] = useState(false);

  useEffect(() => {
    setCanResumeIntake(canResumeFromLanding());
  }, []);

  if (started) {
    return (
      <Suspense fallback={<FormFallback />}>
        <DynamicForm
          onBackToLanding={() => setStarted(false)}
          referralCode={referralCode}
          partnerName={partnerName}
        />
      </Suspense>
    );
  }

  return (
    <LandingPage
      onStart={() => setStarted(true)}
      onResume={canResumeIntake ? () => setStarted(true) : undefined}
      referralCode={referralCode}
      partnerName={partnerName}
    />
  );
}
