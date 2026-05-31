import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Scale, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import { LawyerLeadsSection } from "../_components/LawyerLeadsSection";

export default async function GeneralAttorneyDashboardPage() {
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
  const myId: string        = profile.id;

  // 배당받은 사건만 조회 (admin client 로 RLS 우회)
  const adminClient = createAdminClient();
  const SELECT = "id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes, assigned_to";

  const { data: rawLeads = [] } = await adminClient
    .from("leads")
    .select(SELECT)
    .eq("assigned_to", myId)
    .order("created_at", { ascending: false });

  const allLeads: LeadDetail[] = (rawLeads ?? []).map((l) => ({
    ...(l as LeadDetail),
    assigned_attorney_name: displayName,
  }));

  const PRIORITY = ["신규", "연락대기"];
  const pending    = allLeads.filter((l) => PRIORITY.includes(l.consultation_status));
  const inProgress = allLeads.filter((l) => l.consultation_status === "상담중");
  const done       = allLeads.filter((l) => ["계약완료", "종결", "보류"].includes(l.consultation_status));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-cyan-900 via-[#0f2d5e] to-[#0f2d5e] px-6 pt-8 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-4 h-4 text-cyan-300" />
          <p className="text-cyan-300 text-sm font-medium">담당 노무사 대시보드</p>
        </div>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 노무사님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">
          배당된 사건:{" "}
          <span className="text-white font-bold">{allLeads.length}건</span>
          {pending.length > 0 && <span className="text-orange-300 ml-1">· 검토 대기 {pending.length}건</span>}
        </p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<AlertCircle className="w-5 h-5" />}  label="검토 대기"   value={pending.length}    color="text-orange-500" bg="bg-orange-50" />
          <StatCard icon={<Clock className="w-5 h-5" />}        label="상담 진행중" value={inProgress.length} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="처리 완료"   value={done.length}       color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        {allLeads.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center gap-3 text-slate-400">
            <Scale className="w-10 h-10 opacity-30" />
            <p className="text-sm">아직 배당된 사건이 없습니다.</p>
            <p className="text-xs text-slate-300">대표 노무사가 사건을 배당하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          /* 배당받은 사건 목록 — 상태 변경 가능, 배당 UI 없음 */
          <LawyerLeadsSection
            pending={pending}
            inProgress={inProgress}
            done={done}
            panelRole="일반노무사"
          />
        )}

        <div className="bg-[#0f2d5e] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">담당 사건 처리 안내</p>
            <p className="text-blue-200 text-xs mt-1 leading-relaxed">
              배당받은 사건을 탭하면 상세 정보와 상담 상태를 변경할 수 있습니다.
              상태 변경 즉시 관리자에게도 반영됩니다.
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
