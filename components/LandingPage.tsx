"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseMedical, ChevronDown, ShieldCheck, X } from "lucide-react";
import { ParoBrandHeader } from "@/components/ParoLogo";

const COMPANY_NAME = "노무법인 파로스";

const HERO_ICONS = [
  { Icon: ShieldCheck, color: "text-blue-500" },
  { Icon: BriefcaseMedical, color: "text-slate-400" },
] as const;

const GLASS_ICON =
  "bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center justify-center";

const CARD =
  "bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6";

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  show: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
};

type PressItem = {
  tag: string;
  source: string;
  date: string;
  title: string;
  body: string[];
};

type SuccessCase = {
  emoji: string;
  tag: string;
  amount: string;
  teaser: string;
  period: string;
  fullStory: string;
};

const SUCCESS_CASES: SuccessCase[] = [
  {
    emoji: "🧠",
    tag: "뇌출혈 (뇌심혈관)",
    amount: "2억 1,500만 원",
    teaser: "야근·과로 후 쓰러진 50대 물류 관리직. 회사 '개인 체질' 통보 후 포기 직전…",
    period: "승인까지 약 5개월",
    fullStory:
      "매일 밤 11시까지 물류창고 재고를 맞추며 주 60시간 이상 과로하던 중 쓰러지셨습니다. 회사에서는 평소 혈압이 높았다며 개인 체질 탓으로 돌렸지만, 파로스 노무법인이 1년 치 출퇴근 카드와 야간 작업 지시 카톡을 확보하여 공단 질병판정위원회에서 업무관련성을 100% 입증해 냈습니다. 유족급여 및 장의비로 총 2억 1,500만 원이 지급되었습니다.",
  },
  {
    emoji: "👂",
    tag: "소음성 난청",
    amount: "5,500만 원",
    teaser: "25년 조선소 용접공. '나이 탓'이라며 10년 참았던 귀, 회사 눈치 때문에 침묵…",
    period: "승인까지 약 3개월",
    fullStory:
      "25년간 조선소 용접 현장에서 매일 85dB 이상의 소음 속에서 근무하셨습니다. 귀마개는 형식적으로만 지급되었고, '나이 들면 다 그렇다'는 회사 설명에 10년 넘게 참으셨습니다. 파로스는 동료 진술·작업일지·청력 검사 경과를 모아 소음 노출 기간과 난청 진행의 인과관계를 입증했고, 장해급여·요양비 등 총 5,500만 원의 업무상 질병 산재가 승인되었습니다.",
  },
  {
    emoji: "🦴",
    tag: "근골격계 (허리 디스크)",
    amount: "4,200만 원",
    teaser: "12년 택배 기사, '단순 근육통' 3차 진단. 자비 수술 후 빚만 남은 상황…",
    period: "승인까지 약 4개월",
    fullStory:
      "12년간 택배 상·하차와 장시간 운전을 반복하며 허리 통증이 심해졌지만, 회사·병원 모두 '단순 근육통'으로만 기록되었습니다. 자비로 디스크 수술을 받은 뒤에도 회사는 업무와 무관하다고만 했습니다. 파로스는 배송 동선·적재량 기록과 MRI·수술 기록을 연결해 반복적 중량물 취급과의 업무관련성을 인정받았고, 장해급여·요양비 등 총 4,200만 원이 지급되었습니다.",
  },
];

const PRESS_ITEMS: PressItem[] = [
  {
    tag: "📰 언론 보도",
    source: "네이버 뉴스 · MBC",
    date: "2024.11.20",
    title: "직업병 업무상 질병 산재 인정 범위 확대… 반복 작업 근로자도 해당",
    body: [
      "반복·장시간 자세 유지 등 업무 특성과 연관된 직업병에 대한 산재 인정 기준이 지속적으로 확대되고 있습니다.",
      "단순 노화로 오인해 포기했던 통증·질환도 업무 연관성만 입증되면 보상을 받을 수 있습니다.",
    ],
  },
  {
    tag: "📺 방송 보도",
    source: "KBS 뉴스 9",
    date: "2024.10.15",
    title: "소음성 난청 업무상 질병 산재 급증… 전년 대비 23% 증가",
    body: [
      "소음성 난청 산재 사례가 전년 대비 23% 증가했습니다. 공장·건설·운송 등 소음 노출 직종에서 두드러집니다.",
      "업무상 질병 산재는 회사가 아닌 산재보험에서 지급되며, 신청 자체가 불이익 사유가 될 수 없습니다.",
    ],
  },
  {
    tag: "✍️ 전문가 칼럼",
    source: `${COMPANY_NAME} 노무사`,
    date: "2024.09.08",
    title: "내가 받은 업무상 질병 산재 보상금이 너무 적은 이유 5가지",
    body: [
      "장해등급 산정 자료 부족, 치료비 누락 등 절차상 빈틈이 많은 근로자가 예상보다 적은 금액을 받습니다.",
      "전문 노무사와 함께 이의신청·재심사를 진행한 사례는 평균 30% 이상 추가 보상을 받았습니다.",
    ],
  },
];

const FAQS = [
  {
    q: "회사에 불이익이 생기지 않나요?",
    a: "업무상 질병 산재 신청은 근로자의 법적 권리입니다. 신청을 이유로 한 해고·불이익은 법으로 엄격히 금지되어 있습니다.",
  },
  {
    q: "상담 및 신청 비용이 드나요?",
    a: "초기 자가진단과 상담은 완전 무료입니다. 승인 전까지는 어떠한 비용도 청구하지 않습니다.",
  },
  {
    q: "퇴직 후에도 신청 가능한가요?",
    a: "네, 가능합니다. 재직 중 발생한 질병이라면 치료 종료 후 3년 이내에도 청구할 수 있습니다.",
  },
];

const STRENGTHS = [
  "👨‍⚖️ 산재 특화 공인노무사 그룹 직접 전담",
  "수만 건의 판례를 분석한 산재 전문 노무사팀 배정",
  "착수금·상담료 0원 — 부담 없이 시작",
  "근로복지공단 서류 100% 대행",
  "누락 없는 꼼꼼한 심사로 최대 보상금 확보",
  "요양부터 장해급여까지 원스톱 권리 구제",
];

function SectionTitle({
  badge,
  title,
}: {
  badge: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <span className="inline-block text-[11px] font-bold text-[#3182F6] bg-[#E8F3FF] px-2.5 py-1 rounded-full mb-2">
        {badge}
      </span>
      <h2 className="text-[22px] font-bold text-[#191F28] leading-snug tracking-[-0.02em] whitespace-pre-line">
        {title}
      </h2>
    </div>
  );
}

function TossFaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={faq.q} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 bg-[#F2F4F6] rounded-xl px-5 py-4 text-left"
            >
              <span className="text-[15px] font-semibold text-[#191F28] leading-snug tracking-[-0.02em]">
                Q. {faq.q}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-[#8B95A1] shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 bg-white rounded-xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                    <p className="text-[14px] text-[#8B95A1] leading-relaxed tracking-[-0.02em]">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function SuccessCaseModal({
  item,
  onClose,
}: {
  item: SuccessCase;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="닫기"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-case-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center text-[#8B95A1] hover:bg-[#E5E8EB] transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="text-3xl shrink-0">{item.emoji}</span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#8B95A1]">{item.tag}</p>
            <p
              id="success-case-modal-title"
              className="text-[#3182F6] font-extrabold text-[22px] mt-0.5 tracking-[-0.03em]"
            >
              {item.amount}
            </p>
            <p className="text-[11px] text-[#8B95A1] mt-1">{item.period}</p>
          </div>
        </div>

        <p className="text-[15px] text-[#191F28] leading-[1.75] tracking-[-0.02em] mt-5 pt-5 border-t border-[#F2F4F6]">
          {item.fullStory}
        </p>
      </motion.div>
    </div>
  );
}

function PressModal({
  item,
  onClose,
  onCta,
}: {
  item: PressItem | null;
  onClose: () => void;
  onCta: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative z-10 w-full max-w-md bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#F2F4F6]">
          <div>
            <span className="text-[11px] font-bold text-[#3182F6] bg-[#E8F3FF] px-2 py-0.5 rounded-full">
              {item.tag}
            </span>
            <p className="text-[12px] text-[#8B95A1] mt-2">{item.source} · {item.date}</p>
            <h3 className="text-[18px] font-bold text-[#191F28] mt-1 leading-snug tracking-[-0.02em]">
              {item.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F2F4F6] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4 text-[#8B95A1]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {item.body.map((p) => (
            <p key={p.slice(0, 24)} className="text-[15px] text-[#191F28] leading-[1.75] tracking-[-0.02em]">
              {p}
            </p>
          ))}
        </div>
        <div className="p-5 border-t border-[#F2F4F6]">
          <button
            type="button"
            onClick={onCta}
            className="w-full bg-[#3182F6] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform"
          >
            나도 대상자일까? 1분 무료 확인하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FloatingCTA({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-md p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-auto">
        <button
          type="button"
          onClick={onStart}
          className="w-full bg-[#3182F6] text-white font-bold text-[16px] py-4 rounded-2xl active:scale-[0.98] shadow-lg shadow-[#3182F6]/25 transition-transform tracking-[-0.02em]"
        >
          👉 1분 무료 진단 시작하기
        </button>
      </div>
    </div>
  );
}

export default function LandingPage({
  onStart,
  onResume,
  referralCode: _referralCode,
  partnerName: _partnerName,
}: {
  onStart: () => void;
  onResume?: () => void;
  referralCode?: string | null;
  partnerName?: string | null;
}) {
  const [selectedPress, setSelectedPress] = useState<PressItem | null>(null);
  const [selectedCase, setSelectedCase] = useState<SuccessCase | null>(null);

  const handlePressCta = useCallback(() => {
    setSelectedPress(null);
    onStart();
  }, [onStart]);

  return (
    <div className="max-w-md mx-auto min-h-screen relative pb-28 tracking-[-0.02em]">
      {/* ── Hero ── */}
      <section className="bg-[#F2F4F6] px-5 pt-5 pb-10">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <ParoBrandHeader />
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-[#191F28] font-extrabold text-[28px] leading-snug mt-6 whitespace-pre-line"
        >
          {"일하다 아프셨나요?\n놓치고 있는 내 산재 보상금,\n1분 만에 확인해 보세요."}
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-[15px] text-[#8B95A1] mt-3 leading-relaxed"
        >
          퇴직 후에도 OK · 초기 비용 0원 · 비밀 보장
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex justify-center gap-4 mt-10 mb-12"
        >
          {HERO_ICONS.map(({ Icon, color }, i) => (
            <motion.div
              key={i}
              className={GLASS_ICON}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 2.8 + i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.25,
              }}
            >
              <Icon size={32} strokeWidth={1.75} className={color} />
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          type="button"
          onClick={onStart}
          className="w-full bg-[#3182F6] text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-[#3182F6]/30 active:scale-[0.98] transition-transform"
        >
          내 숨은 보상금 무료 진단하기
        </motion.button>

        {onResume && (
          <motion.div
            custom={4.5}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-3 rounded-xl bg-gray-50/80 px-3 py-2.5 text-center"
          >
            <p className="text-[13px] text-[#8B95A1] leading-snug">
              💡 작성 중인 접수 내역이 있습니다.{" "}
              <button
                type="button"
                onClick={onResume}
                className="inline font-semibold text-[#3182F6] underline-offset-2 hover:underline active:opacity-80"
              >
                서류 이어서 첨부하기 ➔
              </button>
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-6">
          {[
            { value: "91%", label: "승인율" },
            { value: "5,000+", label: "누적 상담" },
            { value: "0원", label: "초기 비용" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl py-3 px-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[#3182F6] font-extrabold text-lg">{stat.value}</p>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Success cases ── */}
      <section className="bg-white px-5 py-10">
        <SectionTitle
          badge="실제 승인 사례"
          title={"파로스와 함께 받은\n업무상 질병 산재 보상금"}
        />
        <div className="space-y-4">
          {SUCCESS_CASES.map((c) => (
            <button
              key={c.tag}
              type="button"
              onClick={() => setSelectedCase(c)}
              className={`${CARD} w-full text-left cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.99]`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#8B95A1]">{c.tag}</p>
                  <p className="text-[#3182F6] font-extrabold text-[22px] mt-0.5 tracking-[-0.03em]">
                    {c.amount}
                  </p>
                  <p className="text-[11px] text-[#8B95A1] mt-1">{c.period}</p>
                </div>
              </div>
              <p className="text-[14px] text-[#8B95A1] mt-4 leading-relaxed border-t border-[#F2F4F6] pt-4">
                {c.teaser}
              </p>
              <p className="text-[12px] text-[#3182F6] font-semibold mt-3">자세히 보기 →</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── News ── */}
      <section className="bg-[#F2F4F6] py-10">
        <div className="px-5">
          <SectionTitle
            badge="언론·전문가"
            title={"뉴스와 전문가도\n인정한 산재 이슈"}
          />
        </div>
        <div
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pl-5 pr-6 pb-2 touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {PRESS_ITEMS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setSelectedPress(item)}
              className={`${CARD} flex-none w-[280px] shrink-0 snap-center text-left active:scale-[0.99] transition-transform`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold text-[#3182F6] bg-[#E8F3FF] px-2 py-0.5 rounded-full">
                  {item.tag}
                </span>
                <span className="text-[11px] text-[#8B95A1]">{item.date}</span>
              </div>
              <p className="text-[15px] font-bold text-[#191F28] leading-snug line-clamp-3 mb-2">
                {item.title}
              </p>
              <p className="text-[12px] text-[#8B95A1]">{item.source}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Strengths ── */}
      <section className="bg-white px-5 py-10">
        <SectionTitle badge="파로스 강점" title={"왜 파로스인가요?"} />
        <div className={CARD}>
          <ul className="space-y-3">
            {STRENGTHS.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[15px] text-[#191F28]">
                <span className="text-[#3182F6] shrink-0">✅</span>
                <span className="leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Expert team ── */}
      <section className="bg-[#F2F4F6] px-5 py-10">
        <SectionTitle
          badge="전문 노무사 그룹"
          title={"산재 특화 공인노무사팀이\n함께합니다"}
        />
        <div className={`${CARD} flex flex-col items-center text-center`}>
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E8F3FF] to-[#F2F4F6] flex items-center justify-center text-4xl mb-4 shadow-[0_4px_16px_rgba(49,130,246,0.12)]">
            👨‍⚖️
          </div>
          <h3 className="text-[20px] font-bold text-[#191F28]">파로스 산재 전문 노무사 그룹</h3>
          <p className="text-[13px] font-semibold text-[#3182F6] mt-1 leading-snug">
            수만 건의 판례를 분석한 산재 전문 노무사팀 배정
          </p>
          <p className="text-[14px] text-[#8B95A1] mt-4 leading-relaxed text-left w-full">
            노무법인 파로스는 산재·질병 사건에 특화된 공인노무사들이 팀으로 협업합니다.
            2018년부터 5,000건 이상의 사건 데이터를 바탕으로, 고객님의 조건에 맞는
            전담 노무사가 불승인 역전부터 이의신청·재심사까지 전 과정을 책임집니다.
          </p>
          <div className="flex flex-wrap gap-2 mt-5 w-full justify-center">
            {["산재 특화 전담", "팀 협업 검토", "1:1 맞춤 수속"].map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold text-[#3182F6] bg-[#E8F3FF] px-3 py-1.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white px-5 py-10">
        <SectionTitle
          badge="자주 묻는 질문"
          title={"걱정되시는 부분,\n솔직하게 답변드립니다"}
        />
        <TossFaqAccordion />
      </section>

      {/* ── Footer CTA block ── */}
      <section className="bg-[#F2F4F6] px-5 py-10">
        <div className={`${CARD} text-center`}>
          <p className="text-[13px] font-semibold text-[#3182F6] mb-2">지금 바로 시작</p>
          <h3 className="text-[20px] font-bold text-[#191F28] leading-snug mb-2">
            1분 무료 진단으로
            <br />
            내 산재 가능성 확인
          </h3>
          <p className="text-[14px] text-[#8B95A1] mb-5">
            비용 없음 · 회사 통보 없음 · 산재 전문 노무사팀 검토
          </p>
          <button
            type="button"
            onClick={onStart}
            className="w-full bg-[#3182F6] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-lg shadow-[#3182F6]/25"
          >
            내 숨은 보상금 무료 진단하기
          </button>
        </div>

        <footer className="mt-10 text-center text-[11px] text-[#8B95A1] leading-relaxed space-y-1">
          <p className="font-semibold text-[#191F28]">{COMPANY_NAME}</p>
          <p>산재 특화 공인노무사 그룹 운영</p>
          <p>사업자등록번호: 364-88-01949</p>
          <p className="pt-2">© {new Date().getFullYear()} {COMPANY_NAME}</p>
        </footer>
      </section>

      <FloatingCTA onStart={onStart} />

      <AnimatePresence>
        {selectedCase && (
          <SuccessCaseModal
            item={selectedCase}
            onClose={() => setSelectedCase(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPress && (
          <PressModal
            item={selectedPress}
            onClose={() => setSelectedPress(null)}
            onCta={handlePressCta}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
