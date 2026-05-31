"use client";

import { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronDown, ChevronLeft, ChevronRight, Award, ClipboardCheck, CheckCircle, Star, X } from "lucide-react";
import ParoLogo, { PARO_GREETING } from "@/components/ParoLogo";

const COMPANY_NAME = "노무법인 파로스";

const HERO_CTA = "내 숨은 산재 보상금, 1분 무료 조회하기 👆";
const PRESS_MODAL_CTA = "기사 속 산재 보상금, 나도 대상자일까? 1분 무료 확인하기 👆";
const SUCCESS_MODAL_CTA = "나도 이 보상금의 주인공? 1분 무료 확인하기 👆";

type PressItem = {
  tag: string;
  source: string;
  date: string;
  title: string;
  color: string;
  body: string[];
};

const FOOTER_INFO = {
  name: "노무법인 파로스",
  representatives: "이경훈, 박진영",
  businessNumber: "364-88-01949",
  address: "서울시 영등포구 문래동3가 77-9 608호",
  email: "cpla9585@nomupharos.com",
} as const;

// ── 성공 사례 ─────────────────────────────────────────────────
type SuccessCase = {
  emoji: string;
  tag: string;
  amount: string;
  teaser: string;
  period: string;
  color: string;
  story: {
    customerStory: string;
    turnaround: string;
    result: string;
  };
};

const SUCCESS_CASES: SuccessCase[] = [
  {
    emoji: "🧠",
    tag: "뇌출혈 (뇌심혈관)",
    amount: "2억 1,500만 원",
    teaser: "야근·과로 후 쓰러진 50대 물류 관리직. 회사 '개인 체질' 통보 후 포기 직전…",
    period: "승인까지 약 5개월",
    color: "from-purple-700 to-purple-900",
    story: {
      customerStory:
        "A씨(52세)는 15년간 물류센터 관리직으로 새벽·야간 대응과 주말 출근이 일상이었습니다. 어느 날 회의 중 갑자기 쓰러져 뇌출혈 진단을 받았고, 회사는 '개인 체질·기존 고혈압'이라며 업무상 질병 산재 신청을 막았습니다. 퇴직 후 치료비만 쌓이고, '이제 될 리 없다'며 포기 직전이었습니다.",
      turnaround: `${COMPANY_NAME}는 근무 시간표·야간 비상 연락 기록·동료 진술·과로 관련 의학 자료를 종합해 업무 연관성을 재입증했습니다. 1차 불승인 이후에도 이의신청·재심사 전략을 세워, '단순 개인 질병'이라는 회사 주장을 끝까지 반박했습니다.`,
      result:
        "업무상 질병 산재 최종 승인. 치료비 100% 지원, 휴업급여, 장해급여를 합산해 총 2억 1,500만 원의 보상이 확정되었습니다.",
    },
  },
  {
    emoji: "👂",
    tag: "소음성 난청",
    amount: "5,500만 원",
    teaser: "25년 조선소 용접공. '나이 탓'이라며 10년 참았던 귀, 회사 눈치 때문에 침묵…",
    period: "승인까지 약 3개월",
    color: "from-blue-600 to-blue-800",
    story: {
      customerStory:
        "B씨(58세)는 조선소 용접공으로 25년간 극심한 소음에 노출됐습니다. 점점 안 들리는 귀를 '나이 들면 다 그렇다'며 10년 넘게 참았고, 회사에 알리면 현장 배치에서 밀려날까 두려워 검사조차 미뤘습니다. 결국 퇴직 후에야 청력 장애 등급을 받았지만, 어디서부터 신청해야 할지 막막했습니다.",
      turnaround: `${COMPANY_NAME}는 현장 소음 측정 자료, 동일 부서 선배들의 승인 사례, 청력 검사 시계열 분석을 바탕으로 업무상 난청임을 입증했습니다. 회사 동의 없이도 가능한 공단 직접 신청 절차를 대행하며, 근로자가 눈치 보지 않고 권리를 행사할 수 있도록 전 과정을 설계했습니다.`,
      result:
        "소음성 난청 업무상 질병 산재 승인. 장해급여·각종 급여를 포함해 총 5,500만 원을 수령했고, 이후 정기 검진 비용도 산재보험에서 지원받게 됐습니다.",
    },
  },
  {
    emoji: "🦴",
    tag: "근골격계 (허리 디스크)",
    amount: "4,200만 원",
    teaser: "12년 택배 기사, '단순 근육통' 3차 진단. 자비 수술 후 빚만 남은 상황…",
    period: "승인까지 약 4개월",
    color: "from-[#0f2d5e] to-[#1e50a2]",
    story: {
      customerStory:
        "C씨(44세)는 12년간 하루 300건 넘게 분류·배송하던 택배 기사였습니다. 허리 통증이 심해졌지만 병원 3곳에서 '디스크 아니다, 단순 근육통' 진단만 받았고, 결국 자비로 수술했습니다. 생활비와 치료비로 빚이 쌓였고, '일 때문에 아픈 게 맞는데 증명할 방법이 없다'며 손을 놓고 있었습니다.",
      turnaround: `${COMPANY_NAME}는 MRI 재검토 의뢰, 직무강도·하중 분석, 택배·물류 업종 동종 판례를 제출해 업무 연관성을 입증했습니다. '개인 질병'으로 처리됐던 기록을 뒤집고, 재직 중 발생·악화 경위를 시간순으로 정리해 공단 심사를 설득했습니다.`,
      result:
        "근골격계 업무상 질병 산재 인정. 치료비 환급과 장해위로금을 합산해 총 4,200만 원을 받았고, 향후 재치료비도 산재보험 급여 대상으로 연결됐습니다.",
    },
  },
];

// ── 언론/블로그 슬라이더 ──────────────────────────────────────
const PRESS_ITEMS: PressItem[] = [
  {
    tag: "📰 언론 보도",
    source: "네이버 뉴스 · MBC",
    date: "2024.11.20",
    title: "직업병 업무상 질병 산재 인정 범위 확대… 반복 작업 근로자도 해당",
    color: "bg-gradient-to-br from-blue-600 to-blue-900",
    body: [
      "최근 고용노동부 발표에 따르면, 반복·장시간 자세 유지 등 업무 특성과 연관된 직업병에 대한 업무상 질병 산재 인정 기준이 지속적으로 확대되고 있다. 제조·물류·건설 등 현장 근로자뿐 아니라 사무직 근로자도 해당 범위에 포함되는 사례가 늘고 있다.",
      "전문가들은 단순 노화나 개인 체질로 오인해 포기했던 통증·질환도, 업무 연관성만 입증되면 산재보험 급여와 장해위로금을 받을 수 있다고 설명한다. 특히 퇴직 후에도 재직 중 발생 질병이라면 3년 이내 청구가 가능하다.",
      "노동계에서는 회사 눈치보다 본인의 정당한 권리 행사가 우선이라며, 무료 자가진단을 통해 대상 여부를 먼저 확인할 것을 권고하고 있다.",
    ],
  },
  {
    tag: "📺 방송 보도",
    source: "KBS 뉴스 9",
    date: "2024.10.15",
    title: "소음성 난청 업무상 질병 산재 급증… 전년 대비 23% 증가",
    color: "bg-gradient-to-br from-red-700 to-red-950",
    body: [
      "근로복지공단 통계에 따르면 소음성 난청으로 인정된 업무상 질병 산재 사례가 전년 대비 23% 증가했다. 공장·건설·운송 등 소음 노출 직종에서 특히 두드러진다.",
      "문제는 근로자 10명 중 7명이 회사에 알리기 두려워 검사·치료를 미루거나 산재 신청을 포기한다는 점이다. 업무상 질병 산재는 회사가 아닌 산재보험에서 지급되며, 신청 자체가 불이익 사유가 될 수 없다.",
      "청각 전문의와 노무사는 초기 증상 단계에서 기록을 남기고 업무 환경 자료를 확보할수록 승인 가능성이 높아진다고 조언한다.",
    ],
  },
  {
    tag: "✍️ 전문가 칼럼",
    source: `${COMPANY_NAME} 노무사`,
    date: "2024.09.08",
    title: "내가 받은 업무상 질병 산재 보상금이 너무 적은 이유 5가지",
    color: "bg-gradient-to-br from-[#0f2d5e] to-[#0a1f42]",
    body: [
      "많은 근로자가 산재 승인 후에도 예상보다 적은 금액을 받고 실망한다. 그 이유는 대부분 장해등급 산정 자료 부족, 치료비 누락, 과거 병력과 업무 연관성 미입증 등 절차상 빈틈에서 비롯된다.",
      "고용노동부 자료에 따르면 전문 노무사·변호사와 함께 이의신청·재심사를 진행한 사례는 최초 산정액 대비 평균 30% 이상 추가 보상을 받은 것으로 나타났다.",
      "전문가는 승인만으로 끝내지 말고, 장해 상태·향후 치료 계획·소득 손실까지 종합 검토해 청구 항목을 재점검할 것을 권한다.",
    ],
  },
  {
    tag: "📺 방송 보도",
    source: "SBS 뉴스",
    date: "2024.08.30",
    title: "회사 눈치 보느라 업무상 질병 산재 못 신청한 근로자 10명 중 7명",
    color: "bg-gradient-to-br from-slate-700 to-slate-950",
    body: [
      "한국노동연구원 설문 결과, 업무 관련 질환을 경험한 근로자 10명 중 7명이 회사 분위기·인사 불이익 우려로 산재 신청을 미루거나 포기한 것으로 조사됐다.",
      "노동법상 업무상 질병 산재 신청을 이유로 한 해고·징계·불이익은 명백한 위법이며, 위반 시 사용자는 형사·행정처분 대상이 될 수 있다. 보상금은 회사가 아닌 국민연금공단 산재보험 재원에서 지급된다.",
      "법률 전문가들은 비밀 보장 상담과 무료 자가진단으로 먼저 대상 여부를 확인한 뒤, 필요 시 전문가와 함께 절차를 진행할 것을 권고했다.",
    ],
  },
  {
    tag: "📊 연구 보고서",
    source: "한국노동연구원",
    date: "2024.07.22",
    title: "직업성 암 업무상 질병 산재 승인율, 3년 새 40% 상승",
    color: "bg-gradient-to-br from-emerald-700 to-emerald-950",
    body: [
      "한국노동연구원 보고서에 따르면 benzene·석면·분진 등 유해물질 노출과 연관된 직업성 암의 업무상 질병 산재 승인율이 최근 3년간 약 40% 상승했다.",
      "과학적 인과관계 입증과 노출 이력 정리가 핵심이며, 동종 업종 선례와 의학 논문을 함께 제출할 경우 승인 속도가 빨라지는 경향이 있다.",
      "연구진은 고위험 직종 근로자에게 정기 건강검진 기록 보관과, 의심 증상 발생 시 즉시 전문 상담을 받을 것을 강조했다.",
    ],
  },
];

// ── FAQ ──────────────────────────────────────────────────────
const FAQS = [
  {
    q: "회사에 불이익이 생기지 않나요?",
    a: "업무상 질병 산재 신청은 근로자의 법적 권리입니다. 업무상 질병 산재 신청을 이유로 해고하거나 불이익을 주는 것은 법으로 엄격히 금지되어 있습니다. 오히려 업무상 질병 산재 신청 후 회사가 보복 조치를 취할 경우, 이를 신고하여 추가 보호를 받을 수 있습니다.",
  },
  {
    q: "상담 및 신청 비용이 드나요?",
    a: "초기 자가진단과 상담은 완전 무료입니다. 저희 노무법인 파로스는 업무상 질병 산재 승인이 완료된 후 성과 보수 방식으로 운영되므로, 승인 전에는 어떠한 비용도 발생하지 않습니다.",
  },
  {
    q: "이미 치료가 끝났거나, 퇴직 후에도 신청 가능한가요?",
    a: "네, 가능합니다. 업무상 질병 산재보험 청구권은 치료 종료 후에도 3년 이내라면 신청할 수 있습니다. 퇴직 후에도 재직 중에 발생한 질병이라면 인정받을 수 있으니, 지금 바로 확인해 보세요.",
  },
];

function scrollToDiagnosisForm() {
  requestAnimationFrame(() => {
    document.getElementById("diagnosis-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ── 승인 사례 모달 ───────────────────────────────────────────
function SuccessCaseModal({
  item,
  onClose,
  onCtaClick,
}: {
  item: SuccessCase | null;
  onClose: () => void;
  onCtaClick: () => void;
}) {
  const open = item !== null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!item) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:px-4 sm:py-8
                  transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-case-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="사례 닫기"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex w-full max-w-lg flex-col bg-white shadow-2xl
                    max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl overflow-hidden
                    transition-all duration-300 ease-out
                    ${open ? "translate-y-0 opacity-100" : "translate-y-full sm:translate-y-4 opacity-0"}`}
      >
        <div className={`bg-gradient-to-r ${item.color} px-5 pt-5 pb-6 shrink-0 relative`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-4xl mb-3 block">{item.emoji}</span>
          <p className="text-white/70 text-xs font-semibold mb-1">{item.tag}</p>
          <p className="text-yellow-300 text-xs font-bold mb-2">💰 최종 보상액</p>
          <h2 id="success-case-title" className="text-white font-black text-3xl sm:text-4xl leading-none tracking-tight">
            {item.amount}
          </h2>
          <p className="text-white/60 text-xs mt-3">{item.period}</p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">
          <section>
            <h3 className="text-xs font-black text-[#0f2d5e] uppercase tracking-widest mb-2">📖 고객 사연</h3>
            <p className="text-[15px] sm:text-base text-slate-700 leading-[1.8]">{item.story.customerStory}</p>
          </section>

          <section className="rounded-2xl bg-[#0f2d5e]/5 border border-[#0f2d5e]/10 px-4 py-4">
            <h3 className="text-xs font-black text-[#0f2d5e] uppercase tracking-widest mb-2">⚡ 파로스의 역전극</h3>
            <p className="text-[15px] sm:text-base text-slate-800 leading-[1.8] font-bold">{item.story.turnaround}</p>
          </section>

          <section>
            <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2">🎉 결과</h3>
            <p className="text-[15px] sm:text-base text-slate-700 leading-[1.8]">{item.story.result}</p>
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCtaClick}
            className="w-full rounded-2xl bg-gradient-to-r from-[#0f2d5e] to-[#1e50a2] text-white font-black text-base sm:text-lg
                       py-4 px-3 shadow-lg active:scale-[0.98] transition-transform leading-snug"
          >
            {SUCCESS_MODAL_CTA}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 기사 모달 ─────────────────────────────────────────────────
function PressArticleModal({
  item,
  onClose,
  onCtaClick,
}: {
  item: PressItem | null;
  onClose: () => void;
  onCtaClick: () => void;
}) {
  const open = item !== null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!item) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:px-4 sm:py-8
                  transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="press-article-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="기사 닫기"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex w-full max-w-lg flex-col bg-white shadow-2xl
                    max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl overflow-hidden
                    transition-all duration-300 ease-out
                    ${open ? "translate-y-0 opacity-100" : "translate-y-full sm:translate-y-4 opacity-0"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-[#0f2d5e] bg-blue-50 px-2 py-0.5 rounded-full">
                {item.tag}
              </span>
              <span className="text-[11px] text-slate-400">{item.date}</span>
            </div>
            <p className="text-xs text-slate-500 mb-1">{item.source}</p>
            <h2
              id="press-article-title"
              className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight"
            >
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <article className="font-serif text-[15px] sm:text-base text-slate-800 leading-[1.85] tracking-[0.01em] space-y-4">
            {item.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </article>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCtaClick}
            className="w-full rounded-2xl bg-gradient-to-r from-[#e85d04] to-[#f48c06] text-white font-black text-base sm:text-lg
                       py-4 px-3 shadow-lg active:scale-[0.98] transition-transform leading-snug"
          >
            {PRESS_MODAL_CTA}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 캐러셀 컴포넌트 ───────────────────────────────────────────
function PressCarousel({ onArticleClick }: { onArticleClick: (index: number) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const timer = setInterval(() => emblaApi.scrollNext(), 3500);
    return () => clearInterval(timer);
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex gap-4 px-1">
          {PRESS_ITEMS.map((item, i) => (
            <div key={i} className="flex-none w-[80vw] max-w-[320px]">
              <button
                type="button"
                onClick={() => onArticleClick(i)}
                className={`${item.color} rounded-2xl p-5 h-48 w-full flex flex-col justify-between shadow-lg text-left
                           hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
                    {item.tag}
                  </span>
                  <span className="text-xs text-white/50">{item.date}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-snug mb-2 line-clamp-3">
                    {item.title}
                  </p>
                  <p className="text-white/60 text-xs">{item.source}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center z-10"
      >
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center z-10"
      >
        <ChevronRight className="w-5 h-5 text-slate-600" />
      </button>

      <div className="flex justify-center gap-1.5 mt-4">
        {PRESS_ITEMS.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedIndex ? "w-6 bg-[#0f2d5e]" : "w-1.5 bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq, i) => (
        <div key={i} className="border-2 border-slate-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
          >
            <span className="text-base font-bold text-slate-800 leading-snug">
              Q. {faq.q}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-5 pt-1">
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4">
                {faq.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage({ onStart, referralCode }: { onStart: () => void; referralCode?: string | null }) {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<PressItem | null>(null);
  const [selectedSuccessCase, setSelectedSuccessCase] = useState<SuccessCase | null>(null);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY >= 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeArticleModal = useCallback(() => setSelectedArticle(null), []);
  const closeSuccessCaseModal = useCallback(() => setSelectedSuccessCase(null), []);

  const handleArticleCta = useCallback(() => {
    setSelectedArticle(null);
    scrollToDiagnosisForm();
  }, []);

  const handleSuccessCaseCta = useCallback(() => {
    setSelectedSuccessCase(null);
    scrollToDiagnosisForm();
  }, []);

  return (
    <div
      className={`min-h-screen bg-slate-50 transition-[padding] duration-300 ease-in-out ${
        showStickyCta ? "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]" : "pb-6"
      }`}
    >

      {/* ─── 섹션 1: 히어로 ─────────────────────────────────── */}
      <section className="bg-[#0a1f42] overflow-hidden">

        <div className="px-6 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-x-3 min-w-0">
            <div className="bg-transparent shrink-0">
              <ParoLogo
                size={64}
                priority
                className="w-14 h-14 sm:w-16 sm:h-16 bg-transparent"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-white text-sm font-bold tracking-wide leading-tight">
                {COMPANY_NAME}
              </span>
              <span className="text-blue-200/80 text-[11px] sm:text-xs leading-snug mt-0.5">
                {PARO_GREETING}
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold">승인율 91%</span>
          </div>
        </div>

        <div className="px-6 pt-7 pb-6">
          <p className="text-blue-300/80 text-xs font-semibold tracking-widest mb-4">
            Since 2018 · 누적 상담 5,000건+
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-[1.32] sm:leading-[1.28] md:leading-[1.2] tracking-tight mb-5">
            내 돈 내고 다닌 병원비,
            <br />
            수천만 원{" "}
            <span className="text-yellow-400">&apos;산재 위로금&apos;으로</span>{" "}
            <span className="text-blue-300">100% 돌려받으세요!</span>
          </h1>
          <p className="text-base sm:text-lg leading-[1.7] sm:leading-relaxed text-blue-100/90 mb-3 max-w-xl">
            <span className="font-bold text-yellow-300">&quot;퇴직했는데 될까?&quot;</span>{" "}
            고민하지 마세요. 질병만 확인되면 무조건 대상입니다. 대한민국 3천만 근로자의 잃어버린
            권리, 파로스가 무료로 찾아드립니다.
          </p>
          {referralCode && (
            <p className="text-blue-200/80 text-xs leading-relaxed mb-1">
              VIP 제휴 파트너 초대 링크로 접속하셨습니다.
            </p>
          )}
        </div>

        <div className="px-6 pt-2 pb-3">
          <button
            onClick={onStart}
            className="w-full bg-white text-[#0f2d5e] text-base sm:text-lg font-black py-5 px-3 rounded-2xl shadow-2xl
                       active:scale-[0.97] transition-transform flex items-center justify-center text-center leading-snug"
          >
            {HERO_CTA}
          </button>
          <p className="text-blue-300/50 text-xs text-center mt-2">소요 시간 약 1분 · 완전 무료 · 비밀 보장</p>
        </div>

        <div className="px-6 pb-10 pt-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Award className="w-5 h-5" />, value: "91%", label: "업무상 질병 산재 승인율" },
              { icon: <CheckCircle className="w-5 h-5" />, value: "5,000+", label: "누적 상담" },
              { icon: <ClipboardCheck className="w-5 h-5" />, value: "무료", label: "웹 진단" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl px-3 py-4 flex flex-col items-center gap-1.5 border border-white/10">
                <span className="text-blue-300">{icon}</span>
                <span className="text-white font-black text-lg leading-none">{value}</span>
                <span className="text-blue-300/80 text-xs text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 섹션 2: 성공 사례 ─────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[#0f2d5e] bg-blue-50 px-2.5 py-1 rounded-full">실제 승인 사례</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-6">
          파로스와 함께 받은
          <br />
          업무상 질병 산재 보상금
        </h2>

        <div className="flex flex-col gap-4">
          {SUCCESS_CASES.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedSuccessCase(c)}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left
                         hover:shadow-md active:scale-[0.99] transition-all cursor-pointer w-full"
            >
              <div className={`bg-gradient-to-r ${c.color} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{c.emoji}</span>
                  <div>
                    <span className="text-white/70 text-xs font-semibold">{c.tag}</span>
                    <p className="text-white font-black text-2xl leading-none">{c.amount}</p>
                  </div>
                </div>
                <span className="text-white/60 text-xs bg-white/10 px-2.5 py-1 rounded-full">{c.period}</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <p className="text-slate-600 text-sm leading-relaxed">{c.teaser}</p>
                <span className="shrink-0 text-[#0f2d5e] text-xs font-bold">자세히 →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── 섹션 3: 언론/블로그 캐러셀 ────────────────────── */}
      <section className="py-8 bg-white border-y border-slate-100">
        <div className="px-6 mb-5">
          <span className="text-xs font-bold text-[#0f2d5e] bg-blue-50 px-2.5 py-1 rounded-full">언론·전문가</span>
          <h2 className="text-2xl font-black text-slate-800 mt-2">
            뉴스와 전문가도
            <br />
            인정한 업무상 질병 산재 이슈
          </h2>
        </div>
        <div className="pl-6 pr-2">
          <PressCarousel onArticleClick={(index) => setSelectedArticle(PRESS_ITEMS[index])} />
        </div>
      </section>

      {/* ─── 섹션 4: FAQ ────────────────────────────────────── */}
      <section className="px-6 py-10">
        <span className="text-xs font-bold text-[#0f2d5e] bg-blue-50 px-2.5 py-1 rounded-full">자주 묻는 질문</span>
        <h2 className="text-2xl font-black text-slate-800 mt-2 mb-6">
          걱정되시는 부분,
          <br />
          솔직하게 답변드립니다
        </h2>
        <FaqAccordion />
      </section>

      {/* ─── 든든한 마무리 ─────────────────────────────────── */}
      <section className="px-6 pb-6">
        <div className="bg-gradient-to-br from-[#0a1f42] to-[#1e50a2] rounded-3xl px-6 py-8 text-center shadow-lg">
          <p className="text-white text-xl sm:text-2xl font-black leading-snug">
            {COMPANY_NAME}는
            <br />
            <span className="text-blue-300">3천만 근로자와</span>
            <br />
            함께 합니다<span className="text-yellow-400">!</span>
          </p>
          <p className="text-blue-200/80 text-sm mt-3 leading-relaxed">
            2018년부터 5,000건 이상의 상담 경험으로
            <br />
            당신의 정당한 권리를 끝까지 지켜드립니다.
          </p>
        </div>
      </section>

      {/* ─── 섹션 5: 폼 진입 CTA ─────────────────────────── */}
      <section id="diagnosis-form-section" className="px-6 pb-16 pt-2 scroll-mt-6">
        <div className="bg-gradient-to-br from-[#0f2d5e] to-[#1e50a2] rounded-3xl p-6 shadow-xl">
          <p className="text-blue-300 text-sm font-bold mb-2">지금 바로 시작하세요</p>
          <h2 className="text-white text-2xl font-black leading-tight mb-2">
            1분 무료 자가진단으로
            <br />
            내 업무상 질병 산재 가능성 확인
          </h2>
          <p className="text-blue-200 text-sm mb-6">비용 없음 · 회사 통보 없음 · 전문 노무사 직접 검토</p>
          <button
            onClick={onStart}
            className="w-full bg-white text-[#0f2d5e] text-base sm:text-lg font-black py-5 px-3 rounded-2xl
                       active:scale-[0.97] transition-transform shadow-lg flex items-center justify-center text-center leading-snug"
          >
            {HERO_CTA}
          </button>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="px-6 pb-8 pt-10 bg-slate-100 border-t border-slate-200">
        <div className="max-w-md mx-auto space-y-3 text-xs text-slate-500 leading-relaxed">
          <div className="flex flex-col items-center gap-2 pb-4 border-b border-slate-200 mb-2">
            <div className="bg-transparent shrink-0">
              <ParoLogo size={64} className="w-14 h-14 sm:w-16 sm:h-16 bg-transparent" />
            </div>
            <p className="text-sm font-bold text-slate-800 text-center">{PARO_GREETING}</p>
            <p className="text-slate-400 text-center">{FOOTER_INFO.name}</p>
          </div>
          <p>대표 노무사: {FOOTER_INFO.representatives}</p>
          <p>사업자등록번호: {FOOTER_INFO.businessNumber}</p>
          <p>주소: {FOOTER_INFO.address}</p>
          <p>
            이메일:{" "}
            <a
              href={`mailto:${FOOTER_INFO.email}`}
              className="text-[#0f2d5e] font-medium hover:underline"
            >
              {FOOTER_INFO.email}
            </a>
          </p>
          <p className="pt-2 text-slate-400 text-center">
            © {new Date().getFullYear()} {FOOTER_INFO.name}. All rights reserved.
          </p>
          <p className="text-slate-400 text-center">
            문의는 1분 무료 확인 폼(웹 접수)을 이용해 주세요.
          </p>
        </div>
      </footer>

      {/* ─── Sticky Bottom CTA ─────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 backdrop-blur-md
                   px-4 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]
                   transition-transform transition-opacity duration-300 ease-in-out
                   ${showStickyCta ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
        style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
        aria-hidden={!showStickyCta}
      >
        <button
          type="button"
          onClick={onStart}
          className="w-full h-[3.75rem] rounded-2xl font-black text-white text-base sm:text-lg
                     flex items-center justify-center gap-2
                     active:scale-[0.98] transition-transform duration-300
                     shadow-lg"
          tabIndex={showStickyCta ? 0 : -1}
          style={{
            background: "linear-gradient(135deg, #e63946 0%, #c1121f 40%, #0f2d5e 100%)",
          }}
        >
          {HERO_CTA}
        </button>
      </div>

      <PressArticleModal
        item={selectedArticle}
        onClose={closeArticleModal}
        onCtaClick={handleArticleCta}
      />

      <SuccessCaseModal
        item={selectedSuccessCase}
        onClose={closeSuccessCaseModal}
        onCtaClick={handleSuccessCaseCta}
      />
    </div>
  );
}
