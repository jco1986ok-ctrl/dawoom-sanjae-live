"use client";

import { useState } from "react";
import { Copy, Link2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/site-url";
import InviteLinkQrModal from "./InviteLinkQrModal";

interface Props {
  agentId: string;
}

function buildCustomerIntakeUrl(agentId: string): string {
  const params = new URLSearchParams({ ref: agentId });
  return `${getSiteUrl()}?${params.toString()}`;
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

/** 종합 요약 — 고객 접수폼 링크 복사 + QR */
export default function CustomerIntakeLinkBanner({ agentId }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const inviteUrl = agentId ? buildCustomerIntakeUrl(agentId) : "";

  const handleCopy = async () => {
    if (!agentId) {
      toast.error("에이전트 코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    await copyText(inviteUrl);
    toast.success("접수폼 링크가 클립보드에 복사되었습니다. 고객에게 전달해 주세요.");
  };

  const handleQrOpen = () => {
    if (!agentId) {
      toast.error("에이전트 코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setQrOpen(true);
  };

  return (
    <>
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-white shadow-sm overflow-hidden min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-5 py-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm sm:text-base break-keep">
                업무상 질병산재 1분만에 조회하기
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-keep leading-relaxed">
                환자에게 전달할 무료 진단·접수 폼 URL을 복사하거나 QR코드로 공유합니다. 링크에
                파트너 실명은 노출되지 않습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                min-h-[44px] px-4 sm:px-5 py-3 rounded-xl font-bold text-sm sm:text-base
                bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white
                shadow-md shadow-blue-600/25 transition-all whitespace-nowrap"
            >
              <Copy className="w-4 h-4 shrink-0" />
              🔗 링크 복사
            </button>
            <button
              type="button"
              onClick={handleQrOpen}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                min-h-[44px] px-4 sm:px-5 py-3 rounded-xl font-bold text-sm sm:text-base
                bg-white hover:bg-blue-50 active:scale-[0.98] text-blue-700
                border-2 border-blue-200 shadow-sm transition-all whitespace-nowrap"
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
        title="고객 접수폼 QR코드"
        description="스마트폰 카메라로 스캔하면 무료 진단·접수 폼으로 바로 이동합니다."
        downloadFileName="파로스_고객접수_QR.png"
      />
    </>
  );
}
