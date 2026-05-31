import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, FileText, TrendingUp, ShieldCheck, UserCircle2 } from "lucide-react";
import type { LeadDetail } from "../_components/LeadDetailPanel";
import AdminMasterInviteButton from "./_components/AdminMasterInviteButton";
import { AdminLeadsSection } from "../_components/AdminLeadsSection";
import AdminUsersSection from "./_components/AdminUsersSection";
import { enrichUsersWithLineage } from "@/lib/user-lineage";
import type { UserRole } from "@/lib/types";

const STATUS_META = [
  { key: "신규",     color: "text-blue-600",    bg: "bg-blue-50" },
  { key: "연락대기", color: "text-yellow-600",  bg: "bg-yellow-50" },
  { key: "상담중",   color: "text-purple-600",  bg: "bg-purple-50" },
  { key: "계약완료", color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "보류",     color: "text-slate-500",   bg: "bg-slate-100" },
  { key: "종결",     color: "text-red-500",     bg: "bg-red-50" },
] as const;

export default async function AdminDashboardPage() {
  // 인증 확인 (서버 클라이언트 — 세션 기반)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role, agent_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "관리자") redirect("/dashboard");

  const adminAgentId = profile.agent_id as string;

  // 어드민 클라이언트로 RLS 우회하여 전체 데이터 조회
  const adminClient = createAdminClient();

  const [{ data: rawLeads = [] }, { data: users = [] }] = await Promise.all([
    adminClient
      .from("leads")
      .select("id, customer_name, phone, disease_name, consultation_status, created_at, referral_source, notes, referred_by_user_id, assigned_to")
      .order("created_at", { ascending: false })
      .limit(50),
    adminClient
      .from("users")
      .select("id, name, role, agent_id, is_active, parent_agent_id")
      .order("created_at", { ascending: false }),
  ]);

  // 유저 id → {name, parent_agent_id, role} 맵 (leads enrich용)
  const userMap: Record<string, { name: string; parent_agent_id: string | null; role: string }> = {};
  (users ?? []).forEach((u) => {
    if (u.id) userMap[u.id as string] = {
      name:            u.name as string,
      parent_agent_id: u.parent_agent_id as string | null,
      role:            u.role as string,
    };
  });

  // 사용자 목록 — parent JOIN + 조직도 체인
  const enrichedUsers = enrichUsersWithLineage(
    (users ?? []).map((u) => ({
      id:              u.id as string,
      name:            u.name as string,
      role:            u.role as UserRole,
      agent_id:          u.agent_id as string,
      is_active:       u.is_active as boolean,
      parent_agent_id: u.parent_agent_id as string | null,
    })),
  );

  // 일반노무사 목록 (배당 드롭다운용)
  const attorneys = (users ?? [])
    .filter((u) => u.role === "노무사" && u.is_active)
    .map((u) => ({ id: u.id as string, name: u.name as string }));

  // leads에 partner_name + parent_partner_name + assigned_attorney_name 주입
  const leads: LeadDetail[] = (rawLeads ?? []).map((l) => {
    const partnerId    = l.referred_by_user_id as string | null;
    const partner      = partnerId ? userMap[partnerId] : null;
    const parentId     = partner?.parent_agent_id ?? null;
    const parentInfo   = parentId ? userMap[parentId] : null;
    const assignedId   = l.assigned_to as string | null;
    const assignedInfo = assignedId ? userMap[assignedId] : null;

    return {
      ...(l as LeadDetail),
      partner_name:            partner?.name ?? null,
      parent_partner_name:     parentInfo?.name ?? null,
      assigned_to:             assignedId,
      assigned_attorney_name:  assignedInfo?.name ?? null,
    };
  });

  // 통계
  const totalLeads  = leads.length;
  const doneLeads   = leads.filter((l) => l.consultation_status === "계약완료").length;
  const totalUsers  = users.length;
  const newThisMonth = leads.filter((l) => {
    const created = new Date(l.created_at as string);
    const now = new Date();
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  const statusCount = STATUS_META.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = leads.filter((l) => l.consultation_status === s.key).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#0f2d5e] px-6 pt-8 pb-14">
        <p className="text-blue-300 text-sm font-medium mb-1">총괄 관리자 대시보드</p>
        <h1 className="text-white text-2xl font-black">노무법인 파로스 관리 현황</h1>
        <p className="text-blue-200 text-sm mt-1">전체 접수 건 및 사용자 현황을 관리합니다.</p>
      </div>

      <div className="px-4 -mt-8 pb-10 flex flex-col gap-6 max-w-4xl mx-auto">

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BigStatCard icon={<FileText className="w-5 h-5" />}    label="전체 접수"   value={`${totalLeads}건`}   color="text-[#0f2d5e]" />
          <BigStatCard icon={<TrendingUp className="w-5 h-5" />}  label="계약 완료"   value={`${doneLeads}건`}    color="text-emerald-600" />
          <BigStatCard icon={<Users className="w-5 h-5" />}       label="전체 사용자" value={`${totalUsers}명`}   color="text-blue-600" />
          <BigStatCard icon={<ShieldCheck className="w-5 h-5" />} label="이번달 신규" value={`${newThisMonth}건`} color="text-orange-500" />
        </div>

        {/* 상담 상태 현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
            <TrendingUp className="w-4 h-4 text-[#0f2d5e]" />
            <h2 className="font-bold text-slate-800 text-sm">상담 상태 현황</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-slate-100">
            {STATUS_META.map((s) => (
              <div key={s.key} className="flex flex-col items-center gap-1 py-5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                  {s.key}
                </span>
                <span className={`text-2xl font-black ${s.color}`}>{statusCount[s.key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 접수 목록 (클릭 시 상세 패널 — 관리자 상태 변경 가능) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
            <FileText className="w-4 h-4 text-[#0f2d5e]" />
            <h2 className="font-bold text-slate-800 text-sm">최근 접수 목록</h2>
            <span className="ml-auto text-xs text-slate-400">최근 {leads.length}건</span>
          </div>
          <AdminLeadsSection leads={leads} showLineage={true} canDelete={true} viewerRole="관리자" attorneys={attorneys} />
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-100">
            <UserCircle2 className="w-4 h-4 text-[#0f2d5e]" />
            <h2 className="font-bold text-slate-800 text-sm">사용자 목록</h2>
            <span className="text-xs text-slate-400 hidden sm:inline">{enrichedUsers.length}명</span>
            <div className="ml-auto flex items-center gap-2">
              <AdminMasterInviteButton agentId={adminAgentId} />
            </div>
          </div>
          <AdminUsersSection
            users={enrichedUsers}
            viewerRole="관리자"
            viewerId={user.id}
          />
        </div>
      </div>
    </div>
  );
}

function BigStatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 flex flex-col gap-2">
      <div className={`${color} opacity-70`}>{icon}</div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
