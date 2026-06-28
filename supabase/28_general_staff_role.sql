-- (선택) 일반팀원 enum — 앱에서는 미사용, 내근 실무는 노무사 계정으로 배정
-- 이미 실행했다면 그대로 두어도 무방합니다.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS '일반팀원';
