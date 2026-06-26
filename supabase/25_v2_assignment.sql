-- V2 담당자 배정 · 내 업무 보드

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assignment_memo text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON public.leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_unread
  ON public.leads(assigned_user_id)
  WHERE is_read = false;

COMMENT ON COLUMN public.leads.assigned_user_id IS 'V2 협업 — 현재 담당 직원 users.id';
COMMENT ON COLUMN public.leads.assignment_memo IS 'V2 배정 시 전달 메모';
COMMENT ON COLUMN public.leads.is_read IS 'V2 — 담당자가 배정 건을 열람했는지';
