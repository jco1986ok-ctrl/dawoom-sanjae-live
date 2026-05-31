-- =============================================================
-- 05_role_expansion.sql
-- 총괄공식파트너(Head Partner) 역할 추가 및 RLS 재정비
-- Supabase SQL Editor에서 실행하세요
-- =============================================================

-- ── STEP 1: 새 enum 값 추가 ──────────────────────────────────
-- PostgreSQL은 enum 중간 삽입 불가 → 맨 앞에 추가
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS '총괄공식파트너';

-- ── STEP 2: current_user_role 헬퍼 함수 (기존 유지) ─────────
-- (이미 존재하므로 재생성하지 않아도 됨)

-- ── STEP 3: 총괄공식파트너용 헬퍼 함수 ──────────────────────
-- 총괄공식파트너의 직속 공식파트너(총판영업자) ID 목록
CREATE OR REPLACE FUNCTION public.my_official_partner_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.users
  WHERE parent_agent_id = auth.uid()
    AND role = '총판영업자'
$$;

-- 총괄공식파트너의 전체 하위 제휴멤버(하위영업자) ID 목록
-- (직속 공식파트너들의 하위 제휴멤버까지 포함)
CREATE OR REPLACE FUNCTION public.my_all_sub_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- 직속 공식파트너
  SELECT id FROM public.users WHERE parent_agent_id = auth.uid()
  UNION ALL
  -- 공식파트너 아래 제휴멤버
  SELECT u.id FROM public.users u
  JOIN public.users p ON u.parent_agent_id = p.id
  WHERE p.parent_agent_id = auth.uid()
$$;

-- ── STEP 4: [users] RLS 정책 재정비 ──────────────────────────

-- 기존 INSERT 정책 삭제 후 재생성
DROP POLICY IF EXISTS "관리자_users_등록" ON public.users;
DROP POLICY IF EXISTS "leads_등록" ON public.leads;

-- [users INSERT] 계급별 생성 권한
-- 관리자: 모든 역할 생성 가능
CREATE POLICY "관리자_users_INSERT"
  ON public.users FOR INSERT
  WITH CHECK ( public.current_user_role() = '관리자' );

-- 총괄공식파트너: 총판영업자·하위영업자·노무사 생성 가능
CREATE POLICY "총괄파트너_users_INSERT"
  ON public.users FOR INSERT
  WITH CHECK (
    public.current_user_role() = '총괄공식파트너'
    AND role IN ('총판영업자', '하위영업자', '노무사')
  );

-- 공식파트너(총판영업자): 하위영업자만 생성 가능
CREATE POLICY "공식파트너_users_INSERT"
  ON public.users FOR INSERT
  WITH CHECK (
    public.current_user_role() = '총판영업자'
    AND role = '하위영업자'
  );

-- ── STEP 5: [users] SELECT 정책 추가 ─────────────────────────

-- 총괄공식파트너: 자신 + 하위 전체 조회
DROP POLICY IF EXISTS "총괄파트너_users_조회" ON public.users;
CREATE POLICY "총괄파트너_users_조회"
  ON public.users FOR SELECT
  USING (
    public.current_user_role() = '총괄공식파트너'
    AND (
      id = auth.uid()
      OR parent_agent_id = auth.uid()
      OR id IN (SELECT public.my_all_sub_ids())
    )
  );

-- ── STEP 6: [leads] RLS 정책 추가 ────────────────────────────

-- 총괄공식파트너: 자신 네트워크 전체 리드 조회
DROP POLICY IF EXISTS "총괄파트너_leads_조회" ON public.leads;
CREATE POLICY "총괄파트너_leads_조회"
  ON public.leads FOR SELECT
  USING (
    public.current_user_role() = '총괄공식파트너'
    AND (
      master_agent_id = auth.uid()
      OR referred_by_user_id = auth.uid()
      OR referred_by_user_id IN (SELECT public.my_all_sub_ids())
    )
  );

-- leads INSERT: 총괄공식파트너도 접수 가능하도록 추가
CREATE POLICY "leads_등록"
  ON public.leads FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('관리자', '총괄공식파트너', '총판영업자', '하위영업자')
  );

-- ── 완료 메시지 ───────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '총괄공식파트너 역할 및 RLS 정책 적용 완료';
END $$;
