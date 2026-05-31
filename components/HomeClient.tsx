"use client";

import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import { SurveyForm } from "@/components/survey/survey-form";

interface Props {
  referralCode: string | null;
}

export default function HomeClient({ referralCode }: Props) {
  const [started, setStarted] = useState(false);

  if (started) return <SurveyForm onBack={() => setStarted(false)} />;
  return <LandingPage onStart={() => setStarted(true)} referralCode={referralCode} />;
}
