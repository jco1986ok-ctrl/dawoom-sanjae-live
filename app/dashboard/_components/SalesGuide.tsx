"use client";

import { useState } from "react";
import { Copy, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const KAKAO_SCRIPT = `고객님, 안녕하세요! 담당 파트너 OOO입니다. 요즘 평생 고생하시며 일하시다 얻은 무릎/허리 통증이나 난청을 '업무상 질병 산재'로 인정받아 국가에서 수천만 원의 보상금을 받는 사례가 정말 많습니다. 거의 다 몰라서 못 받는 숨은 내 돈입니다! 예전 회사에 피해 가는 거 1도 없고, 돈 드는 것도 전혀 없으니 제가 보내드린 파로스 공식 VIP 링크로 1분만 시간 내서 내 보상금이 있는지 꼬옥 무료로 확인해 보세요!`;

const QA_ITEMS = [
  {
    id: "q1",
    title: "Q1. 💡 '업무상 질병 산재'가 정확히 무엇인가요?",
    content: (
      <p>
        흔히 '산재'라고 하면 공사장에서 떨어지거나 기계에 다치는 '사고'만 생각합니다. 하지만 진짜 큰돈이
        되는 것은 <strong>'업무상 질병'</strong>입니다. 수십 년간 무거운 물건을 들고(허리/무릎), 시끄러운
        현장에서 일하고(난청), 스트레스와 과로에 시달려(뇌심혈관) 몸이 망가진 것을 '단순 노화'가 아닌{" "}
        <strong>'일 때문에 얻은 병'</strong>으로 인정받아 국가로부터 막대한 보상금을 받는 제도입니다.
      </p>
    ),
  },
  {
    id: "q2",
    title: "Q2. 💸 보상금액이 왜 이렇게 큰가요? 진짜 수천만 원에서 2억 원까지 나오나요?",
    content: (
      <div className="space-y-2">
        <p>
          네, 사실입니다! 일반적인 실비보험처럼 '병원비'만 띡 던져주고 끝나는 제도가 절대 아닙니다.
          산재로 승인되면, 국가에서 아래 3가지 막대한 보상을 한 번에 쏟아붓습니다.
        </p>
        <ul className="space-y-1 pl-2">
          <li>
            1️⃣ <strong>요양급여 (치료비 100%)</strong>: 병원비, 수술비, 약값은 전액 지원됩니다.
          </li>
          <li>
            2️⃣ <strong>휴업급여 (월급 보전)</strong>: 아파서 일하지 못한 기간 동안, 원래 받던{" "}
            <strong>평균 임금의 70%</strong>를 국가가 월급처럼 줍니다.
          </li>
          <li>
            3️⃣ <strong>장해급여 (가장 큰 목돈 💰)</strong>: 치료가 끝나도 몸에 남은 흉터나 후유증(예:
            꺾이지 않는 무릎, 안 들리는 귀)에 대해 등급을 매겨 막대한 위로금을 지급합니다.
          </li>
        </ul>
        <p>
          특히 뇌심혈관 질환이나 진폐증, 중증 척추 질환 같은 경우 이 3가지가 합쳐져{" "}
          <strong>최소 수천만 원에서 최대 2억 원 이상</strong>의 일시금(또는 연금)이 수령 가능한 최고의
          보호 제도입니다!
        </p>
      </div>
    ),
  },
  {
    id: "q3",
    title: "Q3. 🤦‍♂️ 왜 이렇게 좋은 제도를 사람들은 몰라서 못 받을까요?",
    content: (
      <p>
        대한민국의 산재 제도는 철저한 <strong>'신청주의'</strong>이기 때문입니다. 아무리 몸이 망가져도 내가
        직접 서류를 갖춰서 국가(근로복지공단)에 신청하지 않으면, 나라는 단 1원도 알아서 챙겨주지 않습니다.
        의사 선생님들은 치료만 해줄 뿐 대신 신청해주지 않습니다. 그래서{" "}
        <strong>몰라서 못 받는 눈먼 돈이 수천억 원</strong>에 달합니다!
      </p>
    ),
  },
  {
    id: "q4",
    title: "Q4. 🎯 어떤 고객님께 이 링크를 보내야 가장 유리한가요?",
    content: (
      <div className="space-y-2">
        <p>
          <strong>평생 몸을 써서 일해오신 60대 이상 어르신들이 1순위</strong>입니다.
        </p>
        <p className="font-medium text-muted-foreground">주요 직업군:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>건설/건축 현장직</li>
          <li>공장 생산직</li>
          <li>식당 주방</li>
          <li>청소 노동자</li>
          <li>요양보호사</li>
          <li>택배 및 버스/화물 운전기사</li>
        </ul>
        <p className="text-muted-foreground text-xs">(해당 업종 5~10년 이상 종사자)</p>
      </div>
    ),
  },
  {
    id: "q5",
    title: "Q5. 🦴 대상이 되는 대표적인 질환은 무엇인가요?",
    content: (
      <ul className="space-y-1.5">
        <li>
          <strong>근골격계 질환</strong>: 허리디스크, 척추협착증, 무릎 연골/십자인대 파열, 회전근개(어깨)
          파열
        </li>
        <li>
          <strong>소음성 난청</strong>: 귀에서 삐- 소리가 나거나(이명), TV 소리를 남들보다 크게 트시는 분
        </li>
        <li>
          <strong>뇌심혈관 질환</strong>: 뇌경색, 뇌출혈, 심근경색으로 쓰러지신 이력이 있는 분
        </li>
      </ul>
    ),
  },
  {
    id: "q6",
    title: "Q6. ⏳ 퇴직한 지 오래된 분(또는 고령자)도 신청 가능한가요?",
    content: (
      <p>
        <strong>1000% 가능합니다!</strong> 산재 보상은 현재 그 회사를 다니고 있는지가 중요하지 않습니다.
        과거에 그런 험한 일을 했었다는 이력만 있으면,{" "}
        <strong>퇴직한 지 10년이 넘었어도, 나이가 80세여도</strong> 정당하게 보상받을 수 있습니다.
      </p>
    ),
  },
  {
    id: "q7",
    title: `Q7. 🏢 "예전 회사에 금전적 피해가 가거나 눈치가 보이지 않나요?"`,
    content: (
      <p>
        고객들이 가장 많이 하는 오해입니다! 이 보상금은 예전 사장님 주머니에서 나오는 게 아니라, 국가가
        관리하는 <strong>'산재보험 기금'</strong>에서 지급됩니다.{" "}
        <strong>예전 회사에는 단 1원의 피해도 가지 않으며</strong>, 심지어 예전 회사가 폐업해서 없어졌어도
        100% 보상받으실 수 있습니다. 회사 눈치 볼 필요 전혀 없습니다!
      </p>
    ),
  },
  {
    id: "q8",
    title: `Q8. 🏥 "이미 내 돈으로 병원비 다 내고 수술까지 했는데 받을 수 있나요?"`,
    content: (
      <p>
        당연히 받을 수 있습니다! 업무상 질병으로 인정되면,{" "}
        <strong>과거에 내 돈으로 냈던 치료비(요양급여)를 환급받을 수 있을 뿐만 아니라</strong>, 일하지 못한
        기간의 월급(휴업급여)과 장해급여까지 한 번에 받을 수 있습니다.
      </p>
    ),
  },
  {
    id: "q9",
    title: "Q9. 💸 고객님이 비용을 걱정하십니다. 진짜 무료인가요?",
    content: (
      <p>
        <strong>초기 비용 0원입니다!</strong> 파로스 노무법인은 착수금이나 상담료를 절대 요구하지 않습니다.
        오직 국가로부터 수천만 원의 보상금이 고객님 통장에 완벽하게 꽂혔을 때, 그제야 정해진 수수료를
        정산하는 <strong>'100% 후불제 성공보수'</strong> 방식입니다. 밑져야 본전이니 무료 확인부터 하시는
        게 무조건 이득입니다.
      </p>
    ),
  },
  {
    id: "q10",
    title: "Q10. ⚖️ 왜 굳이 파로스 노무법인에 맡겨야 하나요? 혼자 하면 안 되나요?",
    content: (
      <p>
        일반인이 공단 직원을 상대로 "내 병이 20년 전 일 때문입니다"를 법리적으로 증명하는 것은 계란으로
        바위 치기입니다. 파로스 노무법인은{" "}
        <strong>승인율 91%, 누적 상담 5,000건 이상의 베테랑</strong>입니다. 복잡한 서류 작업부터 공단과의
        행정 싸움까지 노무사가 전부 대신해 드려 승인율을 극대화합니다.
      </p>
    ),
  },
];

function CopyScriptButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(KAKAO_SCRIPT);
      setCopied(true);
      toast.success("카톡 스크립트가 클립보드에 복사되었습니다! 🎉", {
        description: "바로 붙여넣기해서 고객님께 전달하세요.",
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("복사에 실패했습니다. 직접 선택 후 복사해 주세요.");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-bold px-4 py-2 transition-all shadow-md"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          복사 완료!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          카톡 스크립트 복사하기
        </>
      )}
    </button>
  );
}

export default function SalesGuide() {
  return (
    <section className="mt-8">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">
            💡 업무상 질병 산재 실전 영업 가이드
          </h2>
          <p className="text-xs text-muted-foreground">11문 11답 — 고객 설득에 바로 활용하세요</p>
        </div>
      </div>

      {/* 카드 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/40 overflow-hidden">
        <Accordion type="multiple" className="divide-y divide-amber-100 dark:divide-amber-900/30">
          {QA_ITEMS.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b-0 px-4">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3.5">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}

          {/* Q11 — 카톡 스크립트 복사 */}
          <AccordionItem value="q11" className="border-b-0 px-4">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3.5">
              Q11. 📱 [카톡 복붙용] 고객의 마음을 여는 1초 마법 스크립트
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              <blockquote className="border-l-4 border-amber-400 bg-white dark:bg-zinc-900 rounded-r-lg pl-4 pr-3 py-3 text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {KAKAO_SCRIPT}
              </blockquote>
              <p className="mt-2 text-xs text-muted-foreground">
                ※ OOO 부분을 본인 이름으로 바꾸고, 상단의 [🚀 고객 발송용] 링크와 함께 전달하세요.
              </p>
              <CopyScriptButton />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

    </section>
  );
}
