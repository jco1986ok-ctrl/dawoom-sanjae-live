"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "@/app/dashboard/_components/InviteLinkQrModal";
import { copyV2ShareLink, requireAgentId } from "../_lib/v2-link-copy";
import { cn } from "@/lib/utils";

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
  urgentCount?: number;
  staleCount?: number;
}

/** 내근·실무 직책 — 컴팩트 링크 바 (모든 직책 링크 제공) */
export default function V2StaffLinkBar({ agentId, urgentCount = 0, staleCount = 0 }: Props) {
  const [intakeQrOpen, setIntakeQrOpen] = useState(false);
  const [inviteQrOpen, setInviteQrOpen] = useState(false);

  const intakeUrl = agentId ? `${getSiteUrl()}?ref=${agentId}` : "";
  const inviteUrl = agentId ? `${getSiteUrl()}/signup?invite=${agentId}` : "";
  const hasAlert = urgentCount > 0 || staleCount > 0;

  const copyIntake = async () => {
    if (!requireAgentId(agentId, "에이전트 코드를 불러오지 못했습니다.")) return;
    await copyV2ShareLink(intakeUrl);
    toast.success("산재 보상금 확인 링크가 복사되었습니다.");
  };

  const copyInvite = async () => {
    if (!requireAgentId(agentId, "파트너 코드를 불러오지 못했습니다.")) return;
    await copyV2ShareLink(inviteUrl);
    toast.success("동료 초대 링크가 복사되었습니다.");
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-gradient-to-r from-blue-50/80 to-sky-50/60",
          "px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm",
          hasAlert ? "border-amber-200" : "border-blue-100",
        )}
        aria-label="링크 공유"
      >
        {hasAlert && (
          <div className="mb-3 flex flex-wrap gap-2">
            {urgentCount > 0 && (
              <span className="inline-flex items-center rounded-lg bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                신규 상담 {urgentCount}건
              </span>
            )}
            {staleCount > 0 && (
              <span className="inline-flex items-center rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
                지연 {staleCount}건
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button type="button" onClick={copyIntake} className={copyButtonClass}>
              🔗 산재 보상금 확인 링크복사
            </button>
            <button
              type="button"
              onClick={() =>
                requireAgentId(agentId, "에이전트 코드를 불러오지 못했습니다.") &&
                setIntakeQrOpen(true)
              }
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
              onClick={() =>
                requireAgentId(agentId, "파트너 코드를 불러오지 못했습니다.") &&
                setInviteQrOpen(true)
              }
              className={qrButtonClass}
              aria-label="동료 초대 QR코드"
              title="QR코드 보기"
            >
              <QrCode className="size-4" />
            </button>
          </div>
        </div>

        <p className="mt-3 pt-3 border-t border-blue-100 text-center text-xs font-semibold text-[#0f2d5e]">
          📋 칸반 업무 관리 → 상단 탭 「내 업무 보드」
        </p>
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
