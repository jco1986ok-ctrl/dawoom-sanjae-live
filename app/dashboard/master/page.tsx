import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Users, FileText, Award, ArrowUpRight, Inbox } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import ReferralCopyButton from "../_components/ReferralCopyButton";
import PartnerInviteButton from "../_components/PartnerInviteButton";
import { MasterLeadsSection } from "../_components/MasterLeadsSection";
import SalesGuide from "../_components/SalesGuide";


export default async function MasterDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "총판영업자") redirect("/dashboard");

  const agentId: string = profile.agent_id;
  const displayName: string = profile.name;

  // 소속 하위 영업자 목록
  const { data: subAgents = [] } = await supabase
    .from("users")
    .select("id, name, agent_id")
    .eq("parent_agent_id", profile.id)
    .eq("role", "하위영업자")
    .order("name");

  // 통계용: 내 네트워크 전체 리드 (master_agent_id = 내 id)
  const { data: leads = [] } = await supabase
    .from("leads")
    .select("id, customer_name, phone, disease_name, consultation_status, created_at, referred_by_user_id, referral_source, notes")
    .eq("master_agent_id", profile.id)
    .order("created_at", { ascending: false });

  // 접수 목록용: 본인이 직접 유치한 건만
  const { data: directLeads = [] } = await supabase
    .from("leads")
    .select("id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes")
    .eq("referred_by_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // 통계 계산
  const totalLeads = leads.length;
  const doneLeads = leads.filter((l) => l.consultation_status === "계약완료").length;
  const conversionRate = totalLeads > 0 ? Math.round((doneLeads / totalLeads) * 100) : 0;

  // 하위 영업자별 실적 집계
  const leadsByAgent = leads.reduce<Record<string, { total: number; done: number }>>(
    (acc, lead) => {
      const uid = lead.referred_by_user_id as string | null;
      if (!uid) return acc;
      if (!acc[uid]) acc[uid] = { total: 0, done: 0 };
      acc[uid].total++;
      if (lead.consultation_status === "계약완료") acc[uid].done++;
      return acc;
    },
    {},
  );

  const subAgentStats = (subAgents ?? []).map((a) => ({
    id:    a.id as string,
    name:  a.name as string,
    code:  a.agent_id as string,
    total: leadsByAgent[a.id as string]?.total ?? 0,
    done:  leadsByAgent[a.id as string]?.done  ?? 0,
    rate:  leadsByAgent[a.id as string]?.total
      ? Math.round(((leadsByAgent[a.id as string].done) / (leadsByAgent[a.id as string].total)) * 100)
      : 0,
  }));

  const recentLeads = directLeads as LeadDetail[];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0f2d5e] px-6 pt-8 pb-14">
        <p className="text-blue-300 text-sm font-medium mb-1">공식 파트너 대시보드</p>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 파트너님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">실시간 제휴 현황입니다.</p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-5 max-w-4xl mx-auto">

        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="flex-1 w-full">
            <ReferralCopyButton agentId={agentId} />
          </div>
          {/* 공식파트너: 제휴멤버만 생성 가능 */}
          <div className="shrink-0 w-full sm:w-auto">
            <PartnerInviteButton agentId={agentId} variant="compact" />
          </div>
        </div>

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<FileText className="w-5 h-5" />}    label="총 접수 건수"  value={`${totalLeads}건`}           sub="전체 네트워크 합산"  color="text-[#0f2d5e]" />
          <StatCard icon={<Award className="w-5 h-5" />}       label="계약 완료"      value={`${doneLeads}건`}            sub="산재 계약 성사"      color="text-emerald-600" />
          <StatCard icon={<Users className="w-5 h-5" />}       label="소속 멤버"      value={`${(subAgents ?? []).length}명`} sub="소속 제휴 멤버 수"  color="text-blue-600" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />}  label="전환율"         value={`${conversionRate}%`}        sub="계약완료 / 전체접수" color="text-orange-500" />
        </div>

        {/* 소속 제휴 멤버 실적 */}
        <Section title="소속 제휴 멤버 실적" icon={<Users className="w-4 h-4" />}>
          {subAgentStats.length === 0 ? (
            <EmptyState message="소속된 제휴 멤버가 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">제휴 멤버</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">접수</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">계약</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">전환율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subAgentStats.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{a.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{a.code}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{a.total}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{a.done}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0f2d5e] rounded-full" style={{ width: `${a.rate}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{a.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 최근 접수 내역 */}
        <Section title="최근 접수 내역" icon={<FileText className="w-4 h-4" />}>
          {recentLeads.length === 0 ? (
            <EmptyState message="아직 접수된 내역이 없습니다." />
          ) : (
            <MasterLeadsSection leads={recentLeads} />
          )}
        </Section>

        {/* 영업 가이드 */}
        <SalesGuide />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 flex flex-col gap-3">
      <div className={`${color} opacity-80`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-0.5">
          <ArrowUpRight className="w-3 h-3 text-emerald-500" />{sub}
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
        <span className="text-[#0f2d5e]">{icon}</span>
        <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
      <Inbox className="w-10 h-10 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
