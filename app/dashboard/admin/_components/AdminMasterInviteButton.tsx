"use client";

import { useState } from "react";
import { Copy, Crown, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import type { DashboardTestRole } from "@/lib/dashboard-rbac";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "@/app/dashboard/_components/InviteLinkQrModal";

function buildInviteUrl(agentId: string): string {
  return `${getSiteUrl()}/signup?invite=${agentId}`;
}

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

function getPartnerInviteCopy(role: DashboardTestRole) {
  if (role === "마스터") {
    return {
      Icon: Crown,
      title: "👑 본사 직속 파트너 초대",
      description:
        "공식·제휴 파트너를 초대할 가입 링크를 복사하거나 QR코드로 공유합니다.",
      button: "👑 링크 복사",
      toast: "본사 직속 파트너 초대 링크가 복사되었습니다!",
      error: "관리자 파트너 코드가 없습니다. 시스템 관리자에게 문의해 주세요.",
      qrTitle: "파트너 초대 QR코드",
      qrDescription: "스캔하면 파트너·제휴 멤버 가입 페이지로 이동합니다.",
    };
  }
  if (role === "총괄파트너") {
    return {
      Icon: Users,
      title: "🤝 파트너·동료 초대",
      description:
        "공식·제휴 파트너를 초대할 가입 링크를 복사하거나 QR코드로 공유합니다.",
      button: "🤝 링크 복사",
      toast: "파트너 초대 링크가 복사되었습니다!",
      error: "파트너 코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      qrTitle: "파트너 초대 QR코드",
      qrDescription: "스캔하면 파트너·제휴 멤버 가입 페이지로 이동합니다.",
    };
  }
  return {
    Icon: Users,
    title: "🤝 동료 컨설턴트 초대",
    description:
      "동료 컨설턴트를 초대할 가입 링크를 복사하거나 QR코드로 공유합니다.",
    button: "🤝 링크 복사",
    toast: "동료 초대 링크가 복사되었습니다!",
    error: "파트너 코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    qrTitle: "동료 초대 QR코드",
    qrDescription: "스캔하면 제휴 멤버 가입 페이지로 이동합니다.",
  };
}

export default function AdminMasterInviteButton({
  agentId,
  testRole = "마스터",
}: {
  agentId: string;
  testRole?: DashboardTestRole;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const copy = getPartnerInviteCopy(testRole);
  const Icon = copy.Icon;
  const inviteUrl = agentId ? buildInviteUrl(agentId) : "";

  const handleCopy = async () => {
    if (!agentId) {
      toast.error(copy.error);
      return;
    }

    await copyText(inviteUrl);
    toast.success(copy.toast);
  };

  const handleQrOpen = () => {
    if (!agentId) {
      toast.error(copy.error);
      return;
    }
    setQrOpen(true);
  };

  return (
    <>
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-emerald-50/80 to-white shadow-sm overflow-hidden min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-5 py-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/20">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm sm:text-base break-keep">{copy.title}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-keep leading-relaxed">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                min-h-[44px] px-4 sm:px-5 py-3 rounded-xl font-bold text-sm sm:text-base
                bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white
                shadow-md shadow-teal-600/25 transition-all whitespace-nowrap"
            >
              <Copy className="w-4 h-4 shrink-0" />
              {copy.button}
            </button>
            <button
              type="button"
              onClick={handleQrOpen}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                min-h-[44px] px-4 sm:px-5 py-3 rounded-xl font-bold text-sm sm:text-base
                bg-white hover:bg-teal-50 active:scale-[0.98] text-teal-700
                border-2 border-teal-200 shadow-sm transition-all whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              📱 QR코드 보기
            </button>
          </div>
        </div>
      </div>

      <InviteLinkQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={inviteUrl}
        title={copy.qrTitle}
        description={copy.qrDescription}
        downloadFileName="파로스_파트너초대_QR.png"
      />
    </>
  );
}
