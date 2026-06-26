-- V2 업무 대기 6단계 — consultation_status 통일
-- Supabase SQL Editor에서 실행하세요.

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '1차 전화상담 대기';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '서류 취합 중';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '현장방문 예정';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '노무사 서면작성 대기';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '공단접수 대기';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS '공단 심사/결과 대기';

-- 담당 단계 반영 후 상태 일괄 변환
UPDATE public.leads
SET consultation_status = CASE
  WHEN consultation_status::text IN ('신규', '부재중', '상담중', '연락대기', '보류') THEN '1차 전화상담 대기'
  WHEN consultation_status::text IN ('계약완료', '서류준비중')
    AND current_owner_role = 'field_manager' THEN '현장방문 예정'
  WHEN consultation_status::text IN ('계약완료', '서류준비중') THEN '서류 취합 중'
  WHEN current_owner_role = 'attorney'
    AND consultation_status::text NOT IN (
      '공단접수(심사중)', '불승인(재심사)', '산재승인(완료)', '종결(수임불가)', '종결',
      '공단접수 대기', '공단 심사/결과 대기'
    ) THEN '노무사 서면작성 대기'
  WHEN consultation_status::text IN ('공단접수(심사중)', '불승인(재심사)', '산재승인(완료)', '종결(수임불가)', '종결')
    THEN '공단 심사/결과 대기'
  ELSE consultation_status::text
END::public.lead_status
WHERE consultation_status::text NOT IN (
  '1차 전화상담 대기', '서류 취합 중', '현장방문 예정',
  '노무사 서면작성 대기', '공단접수 대기', '공단 심사/결과 대기'
);

ALTER TABLE public.leads
  ALTER COLUMN consultation_status SET DEFAULT '1차 전화상담 대기'::public.lead_status;
