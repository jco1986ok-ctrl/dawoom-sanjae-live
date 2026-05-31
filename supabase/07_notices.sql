-- =============================================================
-- 07_notices.sql — 공지사항 테이블 + RLS
-- 02_rls_policies.sql (current_user_role 함수) 실행 후 적용
-- =============================================================

create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  is_important boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notices_created_at_idx on public.notices (created_at desc);
create index if not exists notices_is_important_idx on public.notices (is_important desc, created_at desc);

alter table public.notices enable row level security;

-- 로그인한 내부 사용자: 조회만
drop policy if exists "notices_select_authenticated" on public.notices;
create policy "notices_select_authenticated"
  on public.notices for select
  to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid())
  );

-- 관리자만 등록
drop policy if exists "notices_insert_admin" on public.notices;
create policy "notices_insert_admin"
  on public.notices for insert
  to authenticated
  with check ( public.current_user_role() = '관리자' );

-- 관리자만 수정
drop policy if exists "notices_update_admin" on public.notices;
create policy "notices_update_admin"
  on public.notices for update
  to authenticated
  using ( public.current_user_role() = '관리자' );

-- 관리자만 삭제
drop policy if exists "notices_delete_admin" on public.notices;
create policy "notices_delete_admin"
  on public.notices for delete
  to authenticated
  using ( public.current_user_role() = '관리자' );

-- 초기 더미 공지 (중복 방지)
insert into public.notices (title, content, is_important)
select
  '🚨 [필독] PC 바탕화면에 파로스 관리시스템 앱(PWA) 설치하는 방법!',
  '1. 대시보드에 로그인합니다.
2. 화면 하단 [앱 설치하기] 버튼을 누릅니다.
3. Chrome·Edge: 브라우저 설치 팝업에서 [설치]를 선택합니다.
4. iPhone Safari: [공유(⍗)] → [홈 화면에 추가]를 선택합니다.

설치 후 홈 화면/바탕화면 아이콘으로 바로 접속할 수 있습니다.',
  true
where not exists (
  select 1 from public.notices
  where title like '%PWA%설치%'
);
