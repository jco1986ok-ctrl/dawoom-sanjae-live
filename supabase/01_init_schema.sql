-- 1) 권한 enum 타입
create type public.user_role as enum ('영업자', '관리자', '노무사');

-- 2) 상담 상태 enum 타입
create type public.lead_status as enum ('신규', '연락대기', '상담중', '계약완료', '보류', '종결');

-- 3) users 테이블
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role public.user_role not null default '영업자',
  agent_id text not null unique,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) leads 테이블
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  disease_name text not null,
  consultation_status public.lead_status not null default '신규',
  referral_source text,
  referred_by_user_id uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) 조회 성능용 인덱스
create index idx_users_role on public.users(role);
create index idx_leads_status on public.leads(consultation_status);
create index idx_leads_referred_by_user_id on public.leads(referred_by_user_id);
create index idx_leads_created_at on public.leads(created_at desc);

-- 6) updated_at 자동 갱신 함수 + 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger trg_leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- 7) Row Level Security 활성화
alter table public.users enable row level security;
alter table public.leads enable row level security;

-- 정책은 다음 단계(인증/권한 설계)에서 role 기준으로 상세 설정 권장
