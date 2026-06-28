"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { buildWeimSignUrl } from "@/lib/weim-sign-link";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

export function WeimSignLinkCopyButton({
  leadId,
  className,
}: {
  leadId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = buildWeimSignUrl(leadId);
    const ok = await copyText(url);
    if (!ok) {
      toast.error("링크 복사에 실패했습니다.");
      return;
    }
    setCopied(true);
    toast.success("위임장 서명 링크가 복사되었습니다.");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-[#3182F6]/40 bg-[#E8F3FF] text-[#3182F6] text-sm font-bold hover:bg-[#dbeafe] transition-colors"
      }
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      ✍️ 위임장 서명 링크 복사
    </button>
  );
}
