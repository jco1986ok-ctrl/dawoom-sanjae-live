"use client";

import { Copy, Crown } from "lucide-react";
import { toast } from "sonner";

export default function AdminMasterInviteButton({ agentId }: { agentId: string }) {
  const handleCopy = async () => {
    if (!agentId) {
      toast.error("관리자 파트너 코드가 없습니다. 시스템 관리자에게 문의해 주세요.");
      return;
    }

    const url = `${window.location.origin}/signup?invite=${agentId}`;

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

    toast.success("본사 직속 파트너 초대 링크가 복사되었습니다!");
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-sm hover:from-amber-600 hover:to-amber-700 transition-colors shrink-0"
    >
      <Crown className="w-4 h-4 shrink-0" />
      [👑 본사 직속 파트너 초대 링크 복사]
    </button>
  );
}
