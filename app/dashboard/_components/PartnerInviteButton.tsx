"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

interface PartnerInviteButtonProps {
  agentId: string;
  variant?: "compact" | "full";
}

export default function PartnerInviteButton({
  agentId,
  variant = "full",
}: PartnerInviteButtonProps) {
  const getInviteUrl = () => `${window.location.origin}/signup?invite=${agentId}`;

  const handleCopy = async () => {
    const url = getInviteUrl();

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    toast.success("동료 초대 링크가 복사되었습니다!");
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-sm font-bold px-4 py-3 rounded-xl shadow-sm shadow-teal-600/20 transition-all whitespace-nowrap"
      >
        <Copy className="w-4 h-4 shrink-0" />
        [🤝 동료 컨설턴트 초대 링크 복사]
      </button>
    );
  }

  return (
    <div className="mt-5 pb-2">
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-base sm:text-lg py-5 px-4 shadow-lg shadow-teal-600/25 transition-all"
      >
        <Copy className="w-5 h-5 shrink-0" />
        [🤝 동료 컨설턴트 초대 링크 복사]
      </button>
    </div>
  );
}
