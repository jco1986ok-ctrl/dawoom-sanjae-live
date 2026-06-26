"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const SANJAE_FAQ_ITEMS: FaqItem[] = [
  {
    id: "q1",
    question: "'사고성 산재'와 '업무상 질병 산재'는 어떤 차이가 있나요?",
    answer:
      "'사고성 산재'는 현장에서 떨어지는 등 명확한 사고로 병원 원무과에서 쉽게 처리가 가능합니다. 반면 타겟으로 잡아야 할 '업무상 질병(골병)'은 반복 작업이나 과로로 서서히 발생한 질환(디스크, 파열, 뇌출혈 등)입니다. 발병 원인을 입증해야 하므로 파로스 같은 전문 노무법인이 반드시 필요하며, 보상 규모가 훨씬 큽니다.",
  },
  {
    id: "q2",
    question: "퇴사한 지 1년이 넘었는데 산재 신청이 가능한가요?",
    answer:
      "네, 무조건 가능합니다! 소멸시효는 진단받은 날로부터 3년(장해급여는 5년)입니다. 퇴사 여부와 상관없이 시효만 지나지 않았다면 신청할 수 있습니다.",
  },
  {
    id: "q3",
    question: "의사가 나이가 많아서 생긴 '퇴행성 질환'이라는데 산재가 될까요?",
    answer:
      "가능합니다! 자연스러운 퇴행성 변화라도, 직업적 요인(무거운 물건 등) 때문에 진행 속도가 비정상적으로 빨라졌다면 산재로 인정받을 수 있습니다.",
  },
  {
    id: "q4",
    question: "일용직, 아르바이트, 프리랜서(특수고용직)도 산재 처리가 되나요?",
    answer:
      "네, 됩니다. 건설 일용직은 물론 택배기사, 배달 라이더, 요양보호사 등 특수형태근로종사자도 산재보험 적용 대상입니다.",
  },
  {
    id: "q5",
    question: "회사에서 4대 보험을 가입해 주지 않았는데 산재가 되나요?",
    answer:
      "가능합니다! 가입 의무는 사업주에게 있으므로, 미가입 상태라도 근로자는 정상적으로 산재 보상을 받을 수 있습니다.",
  },
  {
    id: "q6",
    question: "회사(사장님)가 산재 처리를 절대 안 해준다고 합니다. 어떡하죠?",
    answer:
      "사장님 허락은 필요 없습니다. '사업주 날인 제도'가 폐지되어, 회사의 동의 없이 근로자가 파로스와 함께 직접 공단에 신청하면 됩니다.",
  },
  {
    id: "q7",
    question: "제가 산재를 신청하면 회사에 불이익(보험료 할증 등)이 가나요?",
    answer:
      "'직업성 질병'은 회사 산재 보험료가 절대 오르지 않습니다. 또한 50인 미만 사업장은 할증 대상 자체가 아니므로 회사에 큰 불이익이 없습니다.",
  },
  {
    id: "q8",
    question: "회사가 이미 부도가 났거나 폐업했는데도 산재 신청이 가능한가요?",
    answer:
      "네, 가능합니다. 보상금은 국가(근로복지공단)에서 지급하므로, 발병 당시의 소속만 입증되면 현재 회사의 폐업 여부와 무관하게 보상받을 수 있습니다.",
  },
  {
    id: "q9",
    question: "외국인 근로자나 불법체류자도 산재 처리가 되나요?",
    answer:
      "당연히 됩니다. 국적이나 체류 자격(불법체류 포함)을 따지지 않고 내국인과 100% 동일하게 보상받을 수 있습니다.",
  },
  {
    id: "q10",
    question: "산재 승인이 나면 구체적으로 어떤 돈을 받게 되나요?",
    answer:
      "크게 3가지입니다. ① 요양급여(병원비), ② 휴업급여(쉬는 동안 평균임금의 70%), ③ 장해급여(치료 후 남은 후유증에 대한 목돈/연금).",
  },
  {
    id: "q11",
    question: "이미 제 돈으로 병원비를 다 내고 퇴원했는데, 돌려받을 수 있나요?",
    answer:
      "네, 요양비 청구를 통해 환급받을 수 있습니다. (단, 비급여 항목 일부 제외)",
  },
  {
    id: "q12",
    question: "이미 개인 실손보험이나 진단비 보험을 받았는데 산재 청구가 또 되나요?",
    answer:
      "100% 중복 가능합니다! 비급여는 실손에서 받고, 진단비는 산재 보상과 상관없이 중복으로 받습니다.",
  },
  {
    id: "q13",
    question: "산재 장해급여와 개인보험의 후유장해 특약도 중복 지급되나요?",
    answer:
      "네, 가능합니다. 국가에서 장해 등급을 인정받으면 개인보험 청구 시 훨씬 유리한 근거 자료가 됩니다.",
  },
  {
    id: "q14",
    question: "계속 일하다 보니 디스크가 터졌는데 되나요?",
    answer:
      "네, '근골격계 업무상 질병'입니다. 신체 부담 업무를 파로스 노무사가 입증하여 산재를 받아냅니다.",
  },
  {
    id: "q15",
    question: "야근하다가 쓰러져서 뇌출혈/심근경색이 왔는데 산재가 될까요?",
    answer:
      "네, 과로사 산재입니다. 발병 전 돌발 상황, 단기/만성 과로 여부를 근무 기록으로 입증하면 가능합니다.",
  },
  {
    id: "q16",
    question: "20년 전에 시끄러운 공장에서 일했고, 지금 귀가 안 들리는데 되나요?",
    answer:
      "'소음성 난청' 청구가 가능합니다. 과거 85dB 이상 소음 사업장에서 3년 이상 근무했다면 수십 년이 지났어도 목돈(장해급여)을 받을 수 있습니다.",
  },
  {
    id: "q17",
    question: "출퇴근길에 넘어져서 다쳤는데 이것도 산재 처리가 되나요?",
    answer:
      "네, 통상적인 경로와 방법으로 출퇴근하다가 발생한 사고도 '출퇴근 재해'로 보상 가능합니다.",
  },
  {
    id: "q18",
    question: "고객이 폼을 접수하면 산재 승인까지 기간은 얼마나 걸리나요?",
    answer:
      "주력인 '직업성 질병(근골격계 등)'은 공단의 역학조사 등을 거쳐야 하므로 최소 4개월~8개월 이상 소요됩니다.",
  },
  {
    id: "q19",
    question: "산재 치료 기간 중에 회사에서 저를 해고하면 어떡하나요?",
    answer:
      "절대 불가능합니다! 요양을 위해 휴업한 기간과 그 후 30일 동안은 회사가 절대 해고할 수 없도록 법으로 보호받습니다.",
  },
  {
    id: "q20",
    question: "만약 공단에서 산재 불승인 처리가 나오면 그걸로 끝인가요?",
    answer:
      "아닙니다. 90일 이내에 '심사청구' 및 '재심사청구'를 통해 결과를 뒤집을 수 있습니다. 파로스는 이를 뒤집는 데 탁월한 전문성을 가지고 있습니다.",
  },
];

function FaqAccordionItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm"
          aria-hidden
        >
          Q
        </span>

        <span className="min-w-0 flex-1 pt-0.5">
          <span className="text-[11px] font-semibold text-blue-600/80 block mb-1">
            {index}번
          </span>
          <span className="font-bold text-base sm:text-lg text-slate-900 break-keep leading-snug">
            {item.question}
          </span>
        </span>

        <span
          className={cn(
            "shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 transition-transform duration-300",
            isOpen && "rotate-180 text-blue-600",
          )}
          aria-hidden
        >
          <ChevronDown className="w-5 h-5" />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <span
                className="shrink-0 w-8 h-8 rounded-full bg-[#0f2d5e] text-white flex items-center justify-center font-bold text-sm"
                aria-hidden
              >
                A
              </span>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-keep pt-0.5">
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 종합 요약 — 실전 산재 Q&A 20선 */
export default function FAQAccordion() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-w-0">
      <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-10 h-10 rounded-xl bg-[#0f2d5e] flex items-center justify-center shrink-0 shadow-sm">
          <HelpCircle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight break-keep">
            실전 산재 Q&amp;A 20선
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 break-keep leading-relaxed">
            고객 상담·현장 설명 시 바로 활용할 수 있는 핵심 질문과 답변입니다.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {SANJAE_FAQ_ITEMS.map((item, index) => (
          <FaqAccordionItem
            key={item.id}
            item={item}
            index={index + 1}
            isOpen={openIds.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
