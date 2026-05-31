"use client";

import { useState } from "react";
import { Copy, CheckCheck, Link2, MessageCircle } from "lucide-react";

export default function ReferralCopyButton({ agentId }: { agentId: string }) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => `${window.location.origin}?ref=${agentId}`;

  const handleCopy = async () => {
    const url = getUrl();

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

    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  return (
    <div className="bg-gradient-to-br from-[#0f2d5e] to-[#1e50a2] rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Link2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-black text-base leading-snug">
            [🚀 고객 발송용] 내 고객 숨은 보상금 찾아주기 링크
          </p>
          <p className="text-blue-100/90 text-sm mt-2 leading-relaxed">
            평생 몸 바쳐 일하시다 병을 얻은 고객님께, 수천만 원의 숨겨진 '감사 보상금'을
            찾아주세요. 파트너님이 보내신 이 링크 하나가, 아픈 고객님의 인생을 바꾸는 가장 큰
            선물이 됩니다.
          </p>
        </div>
      </div>

      <div className="bg-white/10 rounded-xl px-4 py-2.5 border border-white/20">
        <p className="text-blue-100 text-xs font-mono tracking-tight truncate">
          {typeof window !== "undefined"
            ? `${window.location.origin}?ref=${agentId}`
            : `https://도메인/?ref=${agentId}`}
        </p>
      </div>

      <button
        onClick={handleCopy}
        className={`
          w-full flex items-center justify-center gap-2.5 
          py-4 rounded-2xl font-black text-base sm:text-lg
          transition-all duration-300 active:scale-[0.97]
          ${copied
            ? "bg-emerald-400 text-white shadow-emerald-400/30 shadow-lg"
            : "bg-white text-[#0f2d5e] hover:bg-blue-50 shadow-white/20 shadow-lg"
          }
        `}
      >
        {copied ? (
          <>
            <CheckCheck className="w-6 h-6" />
            복사 완료!
          </>
        ) : (
          <>
            <Copy className="w-6 h-6" />
            🚀 고객 발송용 링크 복사하기
          </>
        )}
      </button>

      {copied && (
        <div className="flex items-start gap-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <MessageCircle className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-bold text-sm">✅ 고객 발송용 링크가 복사되었습니다!</p>
            <p className="text-emerald-200 text-xs mt-0.5">카카오톡으로 고객에게 바로 전달하세요!</p>
          </div>
        </div>
      )}
    </div>
  );
}
