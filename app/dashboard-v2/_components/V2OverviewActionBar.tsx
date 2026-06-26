"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "@/app/dashboard/_components/InviteLinkQrModal";
import { cn } from "@/lib/utils";

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

const copyButtonClass =
  "inline-flex flex-1 items-center justify-center py-2 px-4 text-sm font-medium rounded-lg " +
  "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 " +
  "transition-colors min-h-10 whitespace-nowrap";

const qrButtonClass =
  "inline-flex items-center justify-center size-10 shrink-0 rounded-lg " +
  "bg-white text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 " +
  "transition-colors";

interface Props {
  agentId: string;
}

export default function V2OverviewActionBar({ agentId }: Props) {
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
    toast.success("산재 보상금 확인 링크가 복사되었습니다.");
  };

  const copyInvite = async () => {
    if (!agentId) {
      toast.error("파트너 코드를 불러오지 못했습니다.");
      return;
    }
    await copyText(inviteUrl);
    toast.success("동료 초대 링크가 복사되었습니다.");
  };

  const openIntakeQr = () => {
    if (!agentId) {
      toast.error("에이전트 코드를 불러오지 못했습니다.");
      return;
    }
    setIntakeQrOpen(true);
  };

  const openInviteQr = () => {
    if (!agentId) {
      toast.error("파트너 코드를 불러오지 못했습니다.");
      return;
    }
    setInviteQrOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-sky-50/60",
          "px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm",
        )}
        aria-label="링크 공유"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button type="button" onClick={copyIntake} className={copyButtonClass}>
              🔗 산재 보상금 확인 링크복사
            </button>
            <button
              type="button"
              onClick={openIntakeQr}
              className={qrButtonClass}
              aria-label="산재 보상금 확인 QR코드"
              title="QR코드 보기"
            >
              <QrCode className="size-4" />
            </button>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-blue-200/70 shrink-0" aria-hidden />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button type="button" onClick={copyInvite} className={copyButtonClass}>
              🤝 동료 초대 복사
            </button>
            <button
              type="button"
              onClick={openInviteQr}
              className={qrButtonClass}
              aria-label="동료 초대 QR코드"
              title="QR코드 보기"
            >
              <QrCode className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <InviteLinkQrModal
        open={intakeQrOpen}
        onOpenChange={setIntakeQrOpen}
        url={intakeUrl}
        title="산재 보상금 확인 QR코드"
        description="스캔하면 산재 보상금 무료 진단·접수 폼으로 이동합니다."
        downloadFileName="파로스_고객접수_QR.png"
      />
      <InviteLinkQrModal
        open={inviteQrOpen}
        onOpenChange={setInviteQrOpen}
        url={inviteUrl}
        title="동료 초대 QR코드"
        description="스캔하면 동료·제휴 멤버 가입 페이지로 이동합니다."
        downloadFileName="파로스_파트너초대_QR.png"
      />
    </>
  );
}
