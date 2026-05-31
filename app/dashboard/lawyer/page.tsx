import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Scale, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import { LawyerLeadsSection } from "../_components/LawyerLeadsSection";

export default async function LawyerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "노무사") redirect("/dashboard");

  const displayName: string = profile.name;

  // 상태별 리드 조회 — 3개 쿼리 병렬 실행
  const SELECT = "id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes";

  const [
    { data: rawPending = [] },
    { data: rawInProgress = [] },
    { data: rawDone = [] },
  ] = await Promise.all([
    supabase.from("leads").select(SELECT).in("consultation_status", ["신규", "연락대기"]).order("created_at", { ascending: true }),
    supabase.from("leads").select(SELECT).eq("consultation_status", "상담중").order("created_at", { ascending: false }),
    supabase.from("leads").select(SELECT).in("consultation_status", ["계약완료", "종결"]).order("created_at", { ascending: false }).limit(15),
  ]);

  const pending    = rawPending    as LeadDetail[];
  const inProgress = rawInProgress as LeadDetail[];
  const done       = rawDone       as LeadDetail[];

  const pendingCount    = (pending ?? []).length;
  const inProgressCount = (inProgress ?? []).length;
  const doneCount       = (done ?? []).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0f2d5e] px-6 pt-8 pb-14">
        <p className="text-blue-300 text-sm font-medium mb-1">노무사 대시보드</p>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 노무사님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">
          검토 대기:{" "}
          <span className="text-white font-bold">{pendingCount}건</span>
          {pendingCount > 0 && <span className="text-orange-300 ml-1">· 확인이 필요합니다</span>}
        </p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<AlertCircle className="w-5 h-5" />}  label="검토 대기"   value={pendingCount}    color="text-orange-500" bg="bg-orange-50" />
          <StatCard icon={<Clock className="w-5 h-5" />}        label="상담 진행중" value={inProgressCount} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="처리 완료"   value={doneCount}       color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        {/* 3개 섹션 (클릭 시 상세 패널 — 노무사 상태 변경 가능) */}
        <LawyerLeadsSection
          pending={pending}
          inProgress={inProgress}
          done={done}
        />

        {/* 안내 카드 */}
        <div className="bg-[#0f2d5e] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">상태 업데이트 방법</p>
            <p className="text-blue-200 text-xs mt-1 leading-relaxed">
              각 케이스를 탭하면 상세 정보를 확인하고 상담 상태 및 메모를 직접 수정할 수 있습니다.
              저장 즉시 파트너와 관리자에게 반영됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-3 py-4 flex flex-col gap-2 items-center text-center">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
