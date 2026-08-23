ALTER TYPE public.team_role ADD VALUE IF NOT EXISTS 'dosen';

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'rapat';
ALTER TABLE public.notes ADD CONSTRAINT notes_category_check CHECK (category IN ('rapat','survey','arahan_dosen','analisis','data'));

CREATE OR REPLACE FUNCTION public.can_manage_agenda(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND team_role IN ('ketua','wakil','sekretaris','bendahara')
  )
$$;

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'meeting',
  event_at timestamptz NOT NULL,
  location text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_select_authenticated ON public.timeline_events FOR SELECT TO authenticated USING (true);
CREATE POLICY timeline_insert_managers ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (public.can_manage_agenda(auth.uid()) AND created_by = auth.uid());
CREATE POLICY timeline_update_managers ON public.timeline_events FOR UPDATE TO authenticated USING (public.can_manage_agenda(auth.uid())) WITH CHECK (public.can_manage_agenda(auth.uid()));
CREATE POLICY timeline_delete_managers ON public.timeline_events FOR DELETE TO authenticated USING (public.can_manage_agenda(auth.uid()));

CREATE TRIGGER timeline_events_set_updated_at BEFORE UPDATE ON public.timeline_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND id <> auth.uid());