import type { Notice } from "@/lib/types";

export const FALLBACK_NOTICES: Notice[] = [
  {
    id: "fallback-pwa",
    title: "🚨 [필독] PC 바탕화면에 파로스 관리시스템 앱(PWA) 설치하는 방법!",
    content: `1. 대시보드에 로그인합니다.
2. 화면 하단 [앱 설치하기] 버튼을 누릅니다.
3. Chrome·Edge: 브라우저 설치 팝업에서 [설치]를 선택합니다.
4. iPhone Safari: [공유(⍗)] → [홈 화면에 추가]를 선택합니다.

설치 후 홈 화면/바탕화면 아이콘으로 바로 접속할 수 있습니다.`,
    is_important: true,
    created_at: new Date().toISOString(),
  },
];
