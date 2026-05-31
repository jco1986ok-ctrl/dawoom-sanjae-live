import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import ReferralCopyButton from "../_components/ReferralCopyButton";
import PartnerInviteButton from "../_components/PartnerInviteButton";
import { AgentLeadsSection } from "../_components/AgentLeadsSection";
import SalesGuide from "../_components/SalesGuide";

const ALL_STATUSES = ["신규", "연락대기", "상담중", "계약완료", "보류", "종결"];

export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id, parent_agent_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "하위영업자") redirect("/dashboard");

  const agentId: string     = profile.agent_id;
  const displayName: string = profile.name;

  // 총판 이름 조회
  let masterName: string | null = null;
  if (profile.parent_agent_id) {
    const { data: master } = await supabase
      .from("users")
      .select("name, agent_id")
      .eq("id", profile.parent_agent_id)
      .single();
    masterName = master ? `${master.name as string} (${master.agent_id as string})` : null;
  }

  // 내 접수 리드 전체 조회 (phone + notes 포함)
  const { data: raw = [] } = await supabase
    .from("leads")
    .select("id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes")
    .eq("referred_by_user_id", profile.id)
    .order("created_at", { ascending: false });

  const leads = raw as LeadDetail[];

  // 통계
  const totalLeads = leads.length;
  const newLeads   = leads.filter((l) => l.consultation_status === "신규").length;
  const doneLeads  = leads.filter((l) => l.consultation_status === "계약완료").length;

  const statusCount = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.consultation_status === s).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0f2d5e] px-6 pt-8 pb-14">
        <p className="text-blue-300 text-sm font-medium mb-1">제휴 멤버 대시보드</p>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">
          내 코드:{" "}
          <span className="font-mono bg-white/10 px-2 py-0.5 rounded-lg text-white">{agentId}</span>
          {masterName && <span className="ml-2">· 소속 파트너: {masterName}</span>}
        </p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-5 max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="flex-1 w-full">
            <ReferralCopyButton agentId={agentId} />
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <PartnerInviteButton agentId={agentId} variant="compact" />
          </div>
        </div>

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStatCard label="전체 접수" value={totalLeads} color="text-[#0f2d5e]" />
          <MiniStatCard label="신규 대기" value={newLeads}   color="text-blue-500" />
          <MiniStatCard label="계약 완료" value={doneLeads}  color="text-emerald-600" />
        </div>

        {/* 접수 목록 + 상태 분포 (클라이언트 컴포넌트 — 클릭 시 상세 패널) */}
        <AgentLeadsSection
          leads={leads}
          totalLeads={totalLeads}
          statusCount={statusCount}
        />

        {/* 영업 가이드 */}
        <SalesGuide />
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-3 py-4 flex flex-col gap-1 items-center text-center">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-3xl font-black ${color}`}>{value}</span>
    </div>
  );
}
