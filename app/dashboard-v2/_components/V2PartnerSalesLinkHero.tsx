"use client";

import { useState } from "react";
import { Link2, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "@/app/dashboard/_components/InviteLinkQrModal";
import { copyV2ShareLink, requireAgentId } from "../_lib/v2-link-copy";
import { cn } from "@/lib/utils";

interface Props {
  agentId: string;
}

function SalesLinkCard({
  badge,
  title,
  description,
  copyLabel,
  onCopy,
  onQr,
  icon,
  accent,
}: {
  badge: string;
  title: string;
  description: string;
  copyLabel: string;
  onCopy: () => void;
  onQr: () => void;
  icon: React.ReactNode;
  accent: "blue" | "emerald";
}) {
  const isBlue = accent === "blue";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border-2 p-4 sm:p-5",
        isBlue
          ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            isBlue ? "bg-blue-600 shadow-blue-600/30" : "bg-emerald-600 shadow-emerald-600/30",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wide",
              isBlue ? "text-blue-600" : "text-emerald-700",
            )}
          >
            {badge}
          </p>
          <p className="mt-1 text-base sm:text-lg font-black text-slate-900 break-keep">{title}</p>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 min-h-12 py-3 px-4 rounded-xl",
            "text-sm sm:text-base font-bold text-white shadow-md transition-all",
            "hover:brightness-110 active:scale-[0.98]",
            isBlue ? "bg-blue-600 shadow-blue-600/25" : "bg-emerald-600 shadow-emerald-600/25",
          )}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={onQr}
          className={cn(
            "inline-flex size-12 shrink-0 items-center justify-center rounded-xl border-2 bg-white transition-colors",
            isBlue
              ? "border-blue-200 text-blue-600 hover:bg-blue-50"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          )}
          aria-label={`${title} QR코드`}
          title="QR코드 보기"
        >
          <QrCode className="size-5" />
        </button>
      </div>
    </div>
  );
}

/** 공식·제휴 파트너 전용 — 영업 링크 대형 CTA */
export default function V2PartnerSalesLinkHero({ agentId }: Props) {
  const [intakeQrOpen, setIntakeQrOpen] = useState(false);
  const [inviteQrOpen, setInviteQrOpen] = useState(false);

  const intakeUrl = agentId ? `${getSiteUrl()}?ref=${agentId}` : "";
  const inviteUrl = agentId ? `${getSiteUrl()}/signup?invite=${agentId}` : "";

  const copyIntake = async () => {
    if (!requireAgentId(agentId, "에이전트 코드를 불러오지 못했습니다.")) return;
    await copyV2ShareLink(intakeUrl);
    toast.success("산재 보상금 확인 링크가 복사되었습니다. 고객에게 전달하세요!");
  };

  const copyInvite = async () => {
    if (!requireAgentId(agentId, "파트너 코드를 불러오지 못했습니다.")) return;
    await copyV2ShareLink(inviteUrl);
    toast.success("동료 초대 링크가 복사되었습니다.");
  };

  return (
    <>
      <section
        className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-[#0f2d5e] via-blue-700 to-indigo-800 p-1 shadow-xl shadow-blue-900/20"
        aria-label="영업용 링크"
      >
        <div className="rounded-[14px] bg-white px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-lg shadow-amber-500/30">
                📣
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  영업 파트너 전용
                </p>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 break-keep">
                  고객·동료에게 보낼 링크
                </h2>
                <p className="mt-1 text-sm text-slate-600 break-keep">
                  카카오톡으로 바로 공유하세요. 실명은 링크에 노출되지 않습니다.
                </p>
              </div>
            </div>
            <span className="inline-flex self-start items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              매일 가장 먼저 복사
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SalesLinkCard
              badge="고객용"
              title="산재 보상금 확인"
              description="1분 무료 진단·접수 폼 — 잠재 고객에게 전달"
              copyLabel="🔗 링크 복사"
              onCopy={copyIntake}
              onQr={() =>
                requireAgentId(agentId, "에이전트 코드를 불러오지 못했습니다.") &&
                setIntakeQrOpen(true)
              }
              icon={<Link2 className="size-5" />}
              accent="blue"
            />
            <SalesLinkCard
              badge="팀 확장"
              title="동료 초대"
              description="제휴·하위 영업 동료 가입 링크"
              copyLabel="🤝 초대 링크 복사"
              onCopy={copyInvite}
              onQr={() =>
                requireAgentId(agentId, "파트너 코드를 불러오지 못했습니다.") &&
                setInviteQrOpen(true)
              }
              icon={<Users className="size-5" />}
              accent="emerald"
            />
          </div>
        </div>
      </section>

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
