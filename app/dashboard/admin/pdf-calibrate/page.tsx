import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PdfCalibrateTool from "./PdfCalibrateTool";

export default async function PdfCalibratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "관리자") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">관리자 도구</p>
            <h1 className="text-xl font-bold text-slate-900">PDF 좌표 보정</h1>
          </div>
          <Link
            href="/dashboard/admin"
            className="text-sm text-slate-600 underline-offset-2 hover:underline"
          >
            ← 마스터 대시보드
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
        <PdfCalibrateTool />
      </main>
    </div>
  );
}
