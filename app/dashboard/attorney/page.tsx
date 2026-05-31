import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText, Phone, ChevronRight } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types";
import LeadStatusBadge from "../_components/LeadStatusBadge";
import AttorneyLeadActions from "../_components/AttorneyLeadActions";

const PRIORITY_STATUSES: LeadStatus[] = ["신규", "연락대기", "상담중"];

export default async function AttorneyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "노무사") redirect("/dashboard");

  // 전체 리드 조회 (RLS: 노무사는 전체 조회 가능)
  const { data: leads } = await supabase
    .from("leads")
    .select("*, referred_by:users!referred_by_user_id(id, name, agent_id)")
    .order("created_at", { ascending: false });

  const allLeads = (leads ?? []) as Lead[];

  const activeLeads = allLeads.filter((l) =>
    PRIORITY_STATUSES.includes(l.consultation_status),
  );
  const otherLeads = allLeads.filter(
    (l) => !PRIORITY_STATUSES.includes(l.consultation_status),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">노무사 검토 현황</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          처리 대기 <strong className="text-primary">{activeLeads.length}건</strong> / 전체{" "}
          {allLeads.length}건
        </p>
      </div>

      {/* 처리 필요 섹션 */}
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-primary/5">
          <h2 className="font-semibold text-primary text-sm">처리 필요 ({activeLeads.length}건)</h2>
        </div>
        {activeLeads.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            처리 대기 건이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activeLeads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} showActions />
            ))}
          </ul>
        )}
      </div>

      {/* 완료 / 기타 섹션 */}
      {otherLeads.length > 0 && (
        <div className="bg-background rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">
              완료 / 기타 ({otherLeads.length}건)
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {otherLeads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} showActions={false} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead, showActions }: { lead: Lead; showActions: boolean }) {
  return (
    <li className="px-5 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{lead.customer_name}</span>
            <LeadStatusBadge status={lead.consultation_status} />
          </div>
          <span className="text-xs text-muted-foreground">{lead.disease_name}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            {lead.phone}
          </span>
          {lead.referred_by && (
            <span className="text-xs text-muted-foreground">
              유입: {lead.referred_by.name} ({lead.referred_by.agent_id})
            </span>
          )}
          {lead.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-1">
              {lead.notes}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(lead.created_at).toLocaleDateString("ko-KR")}
        </span>
      </div>

      {/* 상태 변경 액션 (클라이언트 컴포넌트) */}
      {showActions && <AttorneyLeadActions leadId={lead.id} currentStatus={lead.consultation_status} />}
    </li>
  );
}
