CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.team_role AS ENUM ('ketua', 'wakil', 'sekretaris', 'bendahara', 'anggota');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  username TEXT NOT NULL DEFAULT 'Anggota',
  avatar_url TEXT,
  team_role public.team_role NOT NULL DEFAULT 'anggota',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author_id UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.note_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_blocks TO authenticated;
GRANT ALL ON public.note_blocks TO service_role;
ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL,
  action TEXT NOT NULL,
  summary TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.note_versions TO authenticated;
GRANT ALL ON public.note_versions TO service_role;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select_authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "notes_select_authenticated" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_authenticated" ON public.notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes_update_authenticated" ON public.notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notes_delete_owner_or_admin" ON public.notes FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "note_blocks_select_authenticated" ON public.note_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "note_blocks_insert_authenticated" ON public.note_blocks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND updated_by = auth.uid());
CREATE POLICY "note_blocks_update_authenticated" ON public.note_blocks FOR UPDATE TO authenticated USING (true) WITH CHECK (updated_by = auth.uid());
CREATE POLICY "note_blocks_delete_authenticated" ON public.note_blocks FOR DELETE TO authenticated USING (true);

CREATE POLICY "note_versions_select_authenticated" ON public.note_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "note_versions_insert_authenticated" ON public.note_versions FOR INSERT TO authenticated WITH CHECK (editor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER note_blocks_set_updated_at BEFORE UPDATE ON public.note_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, 'anggota'), '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.email = 'syariefnirwana35@gmail.com' THEN 'admin'::public.app_role ELSE 'member'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
