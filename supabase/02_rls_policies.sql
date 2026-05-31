-- =============================================================
-- 02_rls_policies.sql
-- 권한별 Row Level Security 정책
-- 반드시 01_init_schema.sql 실행 후 이 파일을 실행하세요.
-- =============================================================

-- ---------------------------------------------------------------
-- [중요] public.users.id 는 Supabase Auth의 auth.uid()와 일치해야 합니다.
-- 관리자가 사용자를 생성할 때: Supabase Dashboard > Authentication에서 계정 생성 후
-- 반환된 auth.uid() 값을 public.users.id로 사용하세요.
-- ---------------------------------------------------------------

-- 0) 현재 로그인 사용자의 역할을 반환하는 헬퍼 함수
--    security definer: 함수 소유자(postgres) 권한으로 실행되어 RLS를 우회해 역할 조회 가능
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer stable
as $$
  select role from public.users where id = auth.uid()
$$;

-- =============================================================
-- [users 테이블] RLS 정책
-- =============================================================

-- 관리자: 모든 사용자 조회 가능
create policy "관리자_users_전체조회"
  on public.users for select
  using ( public.current_user_role() = '관리자' );

-- 영업자 / 노무사: 자기 자신만 조회 가능
create policy "본인_users_조회"
  on public.users for select
  using ( id = auth.uid() );

-- 관리자: 새 사용자 등록 가능
create policy "관리자_users_등록"
  on public.users for insert
  with check ( public.current_user_role() = '관리자' );

-- 관리자: 모든 사용자 정보 수정 가능
create policy "관리자_users_수정"
  on public.users for update
  using ( public.current_user_role() = '관리자' );

-- 본인: 자기 정보 수정 가능 (단, role·agent_id 변경은 RLS만으로는 막기 어려우므로 컬럼 권한 별도 설정 권장)
create policy "본인_users_수정"
  on public.users for update
  using ( id = auth.uid() );

-- 관리자: 사용자 삭제 가능
create policy "관리자_users_삭제"
  on public.users for delete
  using ( public.current_user_role() = '관리자' );

-- =============================================================
-- [leads 테이블] RLS 정책
-- =============================================================

-- 관리자 / 노무사: 모든 상담 건 조회 가능
create policy "관리자_노무사_leads_전체조회"
  on public.leads for select
  using ( public.current_user_role() in ('관리자', '노무사') );

-- 영업자: 본인이 유입시킨 leads만 조회 가능
create policy "영업자_leads_본인조회"
  on public.leads for select
  using (
    public.current_user_role() = '영업자'
    and referred_by_user_id = auth.uid()
  );

-- 관리자 / 영업자: 상담 건 신규 등록 가능
create policy "관리자_영업자_leads_등록"
  on public.leads for insert
  with check ( public.current_user_role() in ('관리자', '영업자') );

-- 관리자: 모든 필드 수정 가능
create policy "관리자_leads_전체수정"
  on public.leads for update
  using ( public.current_user_role() = '관리자' );

-- 노무사: 상담 상태(consultation_status)와 메모(notes)만 수정 가능
--   컬럼 수준 제한은 SQL로 완벽히 표현하기 어려우므로, 서버 코드에서도 반드시 검증하세요.
create policy "노무사_leads_상태수정"
  on public.leads for update
  using ( public.current_user_role() = '노무사' );

-- 관리자: 상담 건 삭제 가능
create policy "관리자_leads_삭제"
  on public.leads for delete
  using ( public.current_user_role() = '관리자' );
