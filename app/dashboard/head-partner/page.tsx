import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TrendingUp, Users, FileText, Award, ArrowUpRight, Inbox, Crown, UserCircle2 } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import ReferralCopyButton from "../_components/ReferralCopyButton";
import PartnerInviteButton from "../_components/PartnerInviteButton";
import { AdminLeadsSection } from "../_components/AdminLeadsSection";
import AdminUsersSection from "../admin/_components/AdminUsersSection";
import SalesGuide from "../_components/SalesGuide";
import { enrichUsersWithLineage } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";

export default async function HeadPartnerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "총괄공식파트너") redirect("/dashboard");

  const adminClient = createAdminClient();
  const agentId: string    = profile.agent_id;
  const displayName: string = profile.name;
  const myId: string        = profile.id;

  // ── 소속 공식파트너 목록 ─────────────────────────────────
  const { data: officialPartners = [] } = await adminClient
    .from("users")
    .select("id, name, agent_id")
    .eq("parent_agent_id", myId)
    .eq("role", "총판영업자")
    .eq("is_active", true)
    .order("name");

  const officialPartnerIds = (officialPartners ?? []).map((p) => p.id as string);

  // ── 직속 제휴멤버 (parent = 총괄파트너 본인) ──────────────
  const { data: directMembers = [] } = await adminClient
    .from("users")
    .select("id, name, agent_id")
    .eq("parent_agent_id", myId)
    .eq("role", "하위영업자")
    .eq("is_active", true);

  // ── 공식파트너 산하 제휴멤버 ──────────────────────────────
  const { data: subMembers = [] } = officialPartnerIds.length
    ? await adminClient
        .from("users")
        .select("id, name, agent_id, parent_agent_id")
        .in("parent_agent_id", officialPartnerIds)
        .eq("role", "하위영업자")
        .eq("is_active", true)
    : { data: [] };

  // ── 전체 리드 (네트워크) ─────────────────────────────────
  const { data: leads = [] } = await adminClient
    .from("leads")
    .select("id, customer_name, phone, disease_name, consultation_status, created_at, referred_by_user_id, referral_source, notes")
    .eq("master_agent_id", myId)
    .order("created_at", { ascending: false });

  // ── 통계 ─────────────────────────────────────────────────
  const totalLeads       = (leads ?? []).length;
  const doneLeads        = (leads ?? []).filter((l) => l.consultation_status === "계약완료").length;
  const conversionRate   = totalLeads > 0 ? Math.round((doneLeads / totalLeads) * 100) : 0;
  const totalMemberCount = (officialPartners ?? []).length + (directMembers ?? []).length + (subMembers ?? []).length;

  // ── 공식파트너별 실적 집계 ────────────────────────────────
  const leadsByMasterId = (leads ?? []).reduce<Record<string, { total: number; done: number }>>(
    (acc, lead) => {
      const uid = lead.referred_by_user_id as string | null;
      if (!uid) return acc;
      if (!acc[uid]) acc[uid] = { total: 0, done: 0 };
      acc[uid].total++;
      if (lead.consultation_status === "계약완료") acc[uid].done++;
      return acc;
    }, {},
  );

  const officialPartnerStats = (officialPartners ?? []).map((p) => {
    const pId = p.id as string;
    const pSubIds = (subMembers ?? [])
      .filter((m) => m.parent_agent_id === pId)
      .map((m) => m.id as string);
    const allIds = [pId, ...pSubIds];
    const total = allIds.reduce((s, id) => s + (leadsByMasterId[id]?.total ?? 0), 0);
    const done  = allIds.reduce((s, id) => s + (leadsByMasterId[id]?.done  ?? 0), 0);
    return {
      id:      pId,
      name:    p.name as string,
      code:    p.agent_id as string,
      members: pSubIds.length,
      total, done,
      rate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // ── 파트너 이름 맵 (네트워크 전체 + 본인) ────────────────────
  const networkUserMap: Record<string, string> = {};
  networkUserMap[myId] = displayName; // 본인(총괄파트너)
  (officialPartners ?? []).forEach((p) => { if (p.id) networkUserMap[p.id as string] = p.name as string; });
  (directMembers   ?? []).forEach((m) => { if (m.id) networkUserMap[m.id as string] = m.name as string; });
  (subMembers      ?? []).forEach((m) => { if (m.id) networkUserMap[m.id as string] = m.name as string; });

  // ── leads enrichment ────────────────────────────────────────
  const recentLeads: LeadDetail[] = (leads ?? []).slice(0, 20).map((l) => {
    const referrerId   = l.referred_by_user_id as string | null;
    const partnerName  = referrerId ? (networkUserMap[referrerId] ?? null) : null;
    return {
      ...(l as LeadDetail),
      partner_name:     partnerName,
      is_viewer_direct: referrerId === myId,
    };
  });

  // ── 사용자 목록 (전체 조회, 권한 변경은 본인 라인만) ───────
  const { data: allUsers = [] } = await adminClient
    .from("users")
    .select("id, name, role, agent_id, is_active, parent_agent_id")
    .order("created_at", { ascending: false });

  const enrichedUsers = enrichUsersWithLineage(
    (allUsers ?? []).map((u) => ({
      id:              u.id as string,
      name:            u.name as string,
      role:            u.role as UserRole,
      agent_id:        u.agent_id as string,
      is_active:       u.is_active as boolean,
      parent_agent_id: u.parent_agent_id as string | null,
    })),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-900 via-[#0f2d5e] to-[#0f2d5e] px-6 pt-8 pb-14">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-violet-300" />
          <p className="text-violet-300 text-sm font-medium">총괄 파트너 대시보드</p>
        </div>
        <h1 className="text-white text-2xl font-black">안녕하세요, {displayName} 총괄님 👋</h1>
        <p className="text-blue-200 text-sm mt-1">전체 파트너 네트워크 현황입니다.</p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-5 max-w-4xl mx-auto">

        {/* 제휴 링크 + 계정 생성 버튼 */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="flex-1 w-full">
            <ReferralCopyButton agentId={agentId} />
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <PartnerInviteButton agentId={agentId} variant="compact" />
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<FileText className="w-5 h-5" />}   label="총 접수 건수"   value={`${totalLeads}건`}        sub="전체 네트워크 합산"     color="text-[#0f2d5e]" />
          <StatCard icon={<Award className="w-5 h-5" />}      label="계약 완료"       value={`${doneLeads}건`}         sub="산재 계약 성사"          color="text-emerald-600" />
          <StatCard icon={<Users className="w-5 h-5" />}      label="소속 인원"       value={`${totalMemberCount}명`}  sub="파트너 + 제휴 멤버 합산" color="text-violet-600" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="전환율"          value={`${conversionRate}%`}     sub="계약완료 / 전체접수"    color="text-orange-500" />
        </div>

        {/* 소속 공식파트너 실적 */}
        <Section title="소속 공식 파트너 실적" icon={<Users className="w-4 h-4" />}>
          {officialPartnerStats.length === 0 ? (
            <EmptyState message="소속된 공식 파트너가 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">공식 파트너</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">제휴 멤버</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">접수</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">계약</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">전환율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {officialPartnerStats.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.code}</div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 hidden sm:table-cell">{p.members}명</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{p.total}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{p.done}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${p.rate}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{p.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 사용자 목록 — 본인 라인만 권한 수정 가능 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
            <UserCircle2 className="w-4 h-4 text-violet-700" />
            <h2 className="font-bold text-slate-800 text-sm">사용자 목록</h2>
            <span className="ml-auto text-xs text-slate-400">{enrichedUsers.length}명</span>
          </div>
          <AdminUsersSection
            users={enrichedUsers}
            viewerRole="총괄공식파트너"
            viewerId={myId}
          />
        </div>

        {/* 최근 접수 내역 */}
        <Section title="최근 접수 내역" icon={<FileText className="w-4 h-4" />}>
          {recentLeads.length === 0 ? (
            <EmptyState message="아직 접수된 내역이 없습니다." />
          ) : (
            <AdminLeadsSection
              leads={recentLeads}
              showLineage={true}
              viewerRole="총괄공식파트너"
            />
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
        <span className="text-violet-700">{icon}</span>
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
