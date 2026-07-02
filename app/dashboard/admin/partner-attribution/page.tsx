import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PartnerAttributionAuditPanel } from "@/app/dashboard/_components/PartnerAttributionAuditPanel";
import type { UserRole } from "@/lib/types";

const AUDIT_ACCESS_ROLES = new Set<UserRole>(["관리자", "대표노무사", "총괄공식파트너"]);

export default async function PartnerAttributionAuditPage() {
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

  if (!profile?.role || !AUDIT_ACCESS_ROLES.has(profile.role as UserRole)) {
    redirect("/dashboard");
  }

  return <PartnerAttributionAuditPanel />;
}
