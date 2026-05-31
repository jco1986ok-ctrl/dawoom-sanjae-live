import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Scale, AlertCircle, Clock, CheckCircle2, Users } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import { LawyerLeadsSection } from "../_components/LawyerLeadsSection";

export default async function HeadAttorneyDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "대표노무사") redirect("/dashboard");

  const displayName: string = profile.name;
  const adminClient = createAdminClient();

  // 전체 leads + assigned_to 조회
  const SELECT = "id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes, assigned_to";

  const { data: rawLeads = [] } = await adminClient
    .from("leads")
    .select(SELECT)
    .order("created_at", { ascending: false });

  // 일반노무사 목록 (배당 드롭다운용)
  const { data: rawAttorneys = [] } = await adminClient
    .from("users")
    .select("id, name")
    .eq("role", "노무사")
    .eq("is_active", true)
    .order("name");

  const attorneys = (rawAttorneys ?? []).map((a) => ({ id: a.id as string, name: a.name as string }));

  // 이름 맵
  const attorneyMap = Object.fromEntries(attorneys.map((a) => [a.id, a.name]));

  // leads 그룹화 + assigned_attorney_name enrichment
  const allLeads: LeadDetail[] = (rawLeads ?? []).map((l) => ({
    ...(l as LeadDetail),
    assigned_attorney_name: (l.assigned_to ? (attorneyMap[l.assigned_to as string] ?? null) : null),
  }));

  const PRIORITY = ["신규", "연락대기"];
  const pending    = allLeads.filter((l) => PRIORITY.includes(l.consultation_status));
  const inProgress = allLeads.filter((l) => l.consultation_status === "상담중");
  const done       = allLeads.filter((l) => ["계약완료", "종결", "보류"].includes(l.consultation_status));

  const unassignedCount = allLeads.filter((l) => !l.assigned_to).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-teal-900 via-[#0f2d5e] to-[#0f2d5e] px-6 pt-8 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-4 h-4 text-teal-300" />
          <p className="text-teal-300 text-sm font-medium">대표 노무사 대시보드</p>
        </div>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 노무사님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">
          전체 사건 현황 · 미배당{" "}
          <span className="text-orange-300 font-bold">{unassignedCount}건</span>
        </p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<AlertCircle className="w-5 h-5" />}  label="검토 대기"   value={pending.length}    color="text-orange-500" bg="bg-orange-50" />
          <StatCard icon={<Clock className="w-5 h-5" />}        label="상담 진행중" value={inProgress.length} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="처리 완료"   value={done.length}       color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        {/* 담당 노무사 현황 */}
        {attorneys.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
              <Users className="w-4 h-4 text-teal-700" />
              <h2 className="font-bold text-slate-800 text-sm">담당 노무사 배당 현황</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {attorneys.map((a) => {
                const assignedCount = allLeads.filter((l) => l.assigned_to === a.id).length;
                const activeCount   = allLeads.filter((l) => l.assigned_to === a.id && PRIORITY.concat(["상담중"]).includes(l.consultation_status)).length;
                return (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-slate-800 text-sm">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">전체 {assignedCount}건</span>
                      {activeCount > 0 && (
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          진행 {activeCount}건
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {unassignedCount > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-orange-50/50">
                  <span className="text-sm text-orange-600 font-semibold">미배당</span>
                  <span className="text-xs font-bold text-orange-600">{unassignedCount}건</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 전체 사건 목록 (배당 가능) */}
        <LawyerLeadsSection
          pending={pending}
          inProgress={inProgress}
          done={done}
          attorneys={attorneys}
          panelRole="대표노무사"
        />

        {/* 안내 */}
        <div className="bg-[#0f2d5e] rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">사건 배당 방법</p>
            <p className="text-blue-200 text-xs mt-1 leading-relaxed">
              각 사건을 탭하면 상세 정보와 함께 '담당 노무사 배당' 섹션이 열립니다.
              담당 노무사를 선택하고 배당 버튼을 누르면 즉시 반영됩니다.
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
