-- 상담 코멘트 전용 테이블 (무제한 text · 작성자 실명)
-- Supabase SQL Editor에서 실행

-- leads.notes 는 설문·시스템 로그용 — 상담 메모는 lead_comments 로 분리
ALTER TABLE public.leads
  ALTER COLUMN notes TYPE text;

CREATE TABLE IF NOT EXISTS public.lead_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content     text NOT NULL,
  kind        text NOT NULL DEFAULT 'memo'
                CHECK (kind IN ('memo', 'status', 'system')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_comments_lead_id_created_at_idx
  ON public.lead_comments (lead_id, created_at ASC);

COMMENT ON TABLE public.lead_comments IS '고객 상세 모달 상담 코멘트 (채팅형 UI)';
COMMENT ON COLUMN public.lead_comments.content IS '본문 — text, 글자 수 제한 없음';
COMMENT ON COLUMN public.lead_comments.author_name IS '작성자 실명 (users.name 스냅샷)';

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

-- 관리자·노무사·대표·총괄 — lead_comments 열람
DROP POLICY IF EXISTS lead_comments_select_staff ON public.lead_comments;
CREATE POLICY lead_comments_select_staff ON public.lead_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('관리자', '노무사', '대표노무사', '총괄공식파트너')
    )
  );

-- 상담 메모 작성 (상태 변경 권한과 동일 역할)
DROP POLICY IF EXISTS lead_comments_insert_staff ON public.lead_comments;
CREATE POLICY lead_comments_insert_staff ON public.lead_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('관리자', '노무사', '대표노무사', '총괄공식파트너')
    )
  );
