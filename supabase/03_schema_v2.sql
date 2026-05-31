-- =============================================================
-- 03_schema_v2.sql
-- 4계급 권한 체계로 전면 재설계
-- (총판영업자 / 하위영업자 / 관리자 / 노무사)
--
-- ⚠ 주의: 기존 테이블을 모두 삭제하고 다시 만듭니다.
--         실 운영 데이터가 있다면 먼저 백업하세요.
-- 수파베이스 SQL Editor에 전체 복사 후 [Run] 클릭
-- =============================================================

-- ---------------------------------------------------------------
-- STEP 0: 기존 객체 전부 삭제
-- ---------------------------------------------------------------
drop table if exists public.leads cascade;
drop table if exists public.users cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.my_sub_agent_ids() cascade;
drop type if exists public.user_role cascade;
drop type if exists public.lead_status cascade;

-- ---------------------------------------------------------------
-- STEP 1: Enum 타입 정의
-- ---------------------------------------------------------------

-- 역할 (계급)
create type public.user_role as enum (
  '총판영업자',   -- Master Agent: 하위 영업자를 거느림
  '하위영업자',   -- Sub Agent: 총판 소속
  '관리자',       -- Admin: 전체 관리
  '노무사'        -- Attorney: 케이스 검토 및 상담
);

-- 상담 진행 상태
create type public.lead_status as enum (
  '신규',
  '연락대기',
  '상담중',
  '계약완료',
  '보류',
  '종결'
);

-- ---------------------------------------------------------------
-- STEP 2: users 테이블
-- ---------------------------------------------------------------
create table public.users (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  role             public.user_role not null default '하위영업자',
  agent_id         text        not null unique,          -- 레퍼럴 코드 (고유)
  phone            text,
  is_active        boolean     not null default true,
  parent_agent_id  uuid        references public.users(id) on delete set null,
  -- 하위영업자일 때 본인의 총판영업자 id를 기록
  -- 총판영업자·관리자·노무사는 null
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.users.parent_agent_id is
  '하위영업자 전용: 소속 총판영업자의 users.id';

-- ---------------------------------------------------------------
-- STEP 3: leads 테이블
-- ---------------------------------------------------------------
create table public.leads (
  id                    uuid        primary key default gen_random_uuid(),
  customer_name         text        not null,
  phone                 text        not null,
  disease_name          text        not null,
  consultation_status   public.lead_status not null default '신규',
  referral_source       text,                           -- 유입 경로 메모
  referred_by_user_id   uuid        references public.users(id) on delete set null,
  -- 실제 접수한 영업자 (총판 or 하위)
  master_agent_id       uuid        references public.users(id) on delete set null,
  -- 하위영업자가 접수한 경우 → 그 총판영업자 id 자동 기록
  -- 총판영업자가 직접 접수한 경우 → referred_by_user_id = master_agent_id
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on column public.leads.master_agent_id is
  '접수 영업자가 하위영업자인 경우: 그 소속 총판영업자 id. 총판이 직접 접수 시 referred_by_user_id 와 동일';

-- ---------------------------------------------------------------
-- STEP 4: 인덱스
-- ---------------------------------------------------------------
create index idx_users_role             on public.users(role);
create index idx_users_parent_agent_id  on public.users(parent_agent_id);
create index idx_leads_status           on public.leads(consultation_status);
create index idx_leads_referred_by      on public.leads(referred_by_user_id);
create index idx_leads_master_agent     on public.leads(master_agent_id);
create index idx_leads_created_at       on public.leads(created_at desc);

-- ---------------------------------------------------------------
-- STEP 5: updated_at 자동 갱신 트리거
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- STEP 6: RLS 헬퍼 함수
-- ---------------------------------------------------------------

-- 현재 로그인 사용자의 역할 반환
create or replace function public.current_user_role()
returns public.user_role
language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- 총판영업자용: 자신의 하위영업자 id 목록 반환
create or replace function public.my_sub_agent_ids()
returns setof uuid
language sql security definer stable as $$
  select id from public.users
  where parent_agent_id = auth.uid()
$$;

-- ---------------------------------------------------------------
-- STEP 7: Row Level Security 활성화
-- ---------------------------------------------------------------
alter table public.users enable row level security;
alter table public.leads enable row level security;

-- ---------------------------------------------------------------
-- STEP 8: [users] RLS 정책
-- ---------------------------------------------------------------

-- 관리자: 모든 사용자 조회
create policy "관리자_users_전체조회"
  on public.users for select
  using ( public.current_user_role() = '관리자' );

-- 총판영업자: 자신 + 소속 하위영업자 조회
create policy "총판영업자_users_조회"
  on public.users for select
  using (
    public.current_user_role() = '총판영업자'
    and ( id = auth.uid() or parent_agent_id = auth.uid() )
  );

-- 하위영업자 / 노무사: 자신만 조회
create policy "본인_users_조회"
  on public.users for select
  using ( id = auth.uid() );

-- 관리자: 사용자 등록·수정·삭제
create policy "관리자_users_등록"
  on public.users for insert
  with check ( public.current_user_role() = '관리자' );

create policy "관리자_users_수정"
  on public.users for update
  using ( public.current_user_role() = '관리자' );

create policy "관리자_users_삭제"
  on public.users for delete
  using ( public.current_user_role() = '관리자' );

-- 본인: 자기 정보 수정 (role·agent_id 변경은 앱 레이어에서 추가 검증 권장)
create policy "본인_users_수정"
  on public.users for update
  using ( id = auth.uid() );

-- ---------------------------------------------------------------
-- STEP 9: [leads] RLS 정책
-- ---------------------------------------------------------------

-- 관리자 / 노무사: 전체 리드 조회
create policy "관리자_노무사_leads_전체조회"
  on public.leads for select
  using ( public.current_user_role() in ('관리자', '노무사') );

-- 총판영업자: 자신 직접 접수 건 + 소속 하위영업자 접수 건 모두 조회
create policy "총판영업자_leads_조회"
  on public.leads for select
  using (
    public.current_user_role() = '총판영업자'
    and (
      master_agent_id   = auth.uid()                           -- 자신이 총판인 건
      or referred_by_user_id = auth.uid()                      -- 자신이 직접 접수한 건
      or referred_by_user_id in ( select public.my_sub_agent_ids() ) -- 소속 하위 접수 건
    )
  );

-- 하위영업자: 자신이 접수한 건만 조회
create policy "하위영업자_leads_본인조회"
  on public.leads for select
  using (
    public.current_user_role() = '하위영업자'
    and referred_by_user_id = auth.uid()
  );

-- 관리자 / 총판영업자 / 하위영업자: 신규 리드 등록
create policy "leads_등록"
  on public.leads for insert
  with check (
    public.current_user_role() in ('관리자', '총판영업자', '하위영업자')
  );

-- 관리자: 모든 필드 수정
create policy "관리자_leads_전체수정"
  on public.leads for update
  using ( public.current_user_role() = '관리자' );

-- 노무사: 상담 상태 + 메모만 수정 (앱 레이어에서 컬럼 제한 추가 검증 권장)
create policy "노무사_leads_상태수정"
  on public.leads for update
  using ( public.current_user_role() = '노무사' );

-- 관리자: 리드 삭제
create policy "관리자_leads_삭제"
  on public.leads for delete
  using ( public.current_user_role() = '관리자' );
