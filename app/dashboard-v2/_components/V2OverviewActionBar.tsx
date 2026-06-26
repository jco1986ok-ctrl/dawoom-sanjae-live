"use client";

import { useState } from "react";
import { Link2, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "@/app/dashboard/_components/InviteLinkQrModal";
import { Button } from "@/components/ui/button";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function partnerInviteLabel(role: DashboardTestRole) {
  if (role === "마스터") return "파트너 초대";
  if (role === "총괄파트너") return "파트너 초대";
  return "동료 초대";
}

interface Props {
  agentId: string;
  testRole: DashboardTestRole;
}

export default function V2OverviewActionBar({ agentId, testRole }: Props) {
  const [intakeQrOpen, setIntakeQrOpen] = useState(false);
  const [inviteQrOpen, setInviteQrOpen] = useState(false);

  const intakeUrl = agentId ? `${getSiteUrl()}?ref=${agentId}` : "";
  const inviteUrl = agentId ? `${getSiteUrl()}/signup?invite=${agentId}` : "";

  const copyIntake = async () => {
    if (!agentId) {
      toast.error("에이전트 코드를 불러오지 못했습니다.");
      return;
    }
    await copyText(intakeUrl);
    toast.success("접수폼 링크가 복사되었습니다.");
  };

  const copyInvite = async () => {
    if (!agentId) {
      toast.error("파트너 코드를 불러오지 못했습니다.");
      return;
    }
    await copyText(inviteUrl);
    toast.success("초대 링크가 복사되었습니다.");
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={copyIntake} className="h-8">
          <Link2 className="size-3.5" />
          접수 링크
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => (agentId ? setIntakeQrOpen(true) : toast.error("에이전트 코드를 불러오지 못했습니다."))}
          aria-label="접수 QR"
        >
          <QrCode className="size-3.5" />
        </Button>
        <span className="hidden sm:block w-px h-5 bg-slate-200 mx-0.5" aria-hidden />
        <Button type="button" variant="outline" size="sm" onClick={copyInvite} className="h-8">
          <Users className="size-3.5" />
          {partnerInviteLabel(testRole)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => (agentId ? setInviteQrOpen(true) : toast.error("파트너 코드를 불러오지 못했습니다."))}
          aria-label="초대 QR"
        >
          <QrCode className="size-3.5" />
        </Button>
      </div>

      <InviteLinkQrModal
        open={intakeQrOpen}
        onOpenChange={setIntakeQrOpen}
        url={intakeUrl}
        title="고객 접수폼 QR코드"
        description="스캔하면 무료 진단·접수 폼으로 이동합니다."
        downloadFileName="파로스_고객접수_QR.png"
      />
      <InviteLinkQrModal
        open={inviteQrOpen}
        onOpenChange={setInviteQrOpen}
        url={inviteUrl}
        title="파트너 초대 QR코드"
        description="스캔하면 파트너·제휴 멤버 가입 페이지로 이동합니다."
        downloadFileName="파로스_파트너초대_QR.png"
      />
    </>
  );
}
