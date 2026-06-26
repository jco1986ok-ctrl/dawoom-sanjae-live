-- 3인 협업 워크플로우 (V2) — leads.current_owner_role + notifications

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS current_owner_role text
  DEFAULT 'inside_staff'
  CHECK (current_owner_role IN ('inside_staff', 'field_manager', 'attorney'));

COMMENT ON COLUMN public.leads.current_owner_role IS
  'V2 협업 담당: inside_staff(내근), field_manager(현장), attorney(노무사)';

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'handoff',
  message text NOT NULL,
  from_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_owner_role text CHECK (target_owner_role IN ('inside_staff', 'field_manager', 'attorney')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- INSERT는 서버(service role) 전용 — RLS 기본 거부
