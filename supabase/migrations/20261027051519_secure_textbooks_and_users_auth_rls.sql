ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert/update own user" ON public.users;
DROP POLICY IF EXISTS "Allow read own user" ON public.users;
DROP POLICY IF EXISTS "Allow user to update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Admins can read users" ON public.users FOR SELECT TO authenticated USING (lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) = 'seijiro170622@gmail.com');
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()) AND email = ((SELECT auth.jwt()) ->> 'email') AND coalesce(verified, false) = false);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE TO authenticated USING (lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) = 'seijiro170622@gmail.com') WITH CHECK (lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) = 'seijiro170622@gmail.com');
CREATE OR REPLACE FUNCTION public.protect_user_verification() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
  IF lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) = 'seijiro170622@gmail.com' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.email := (SELECT auth.jwt()) ->> 'email';
  ELSE
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN RAISE EXCEPTION 'Only an administrator can change verification status'; END IF;
    IF NEW.email IS DISTINCT FROM ((SELECT auth.jwt()) ->> 'email') THEN RAISE EXCEPTION 'A user can only use their authenticated email address'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_user_verification ON public.users;
CREATE TRIGGER protect_user_verification BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.protect_user_verification();
DROP POLICY IF EXISTS "Allow everyone to read" ON public.textbooks;
DROP POLICY IF EXISTS "Allow logged in users to insert" ON public.textbooks;
DROP POLICY IF EXISTS "Reserve books" ON public.textbooks;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.textbooks;
DROP POLICY IF EXISTS "Users can update own posts" ON public.textbooks;
CREATE POLICY "Anyone can view textbooks" ON public.textbooks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can list textbooks" ON public.textbooks FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Owners can update textbooks" ON public.textbooks FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can reserve textbooks" ON public.textbooks FOR UPDATE TO authenticated USING (user_id <> (SELECT auth.uid()) AND is_sold = false AND (is_reserved = false OR reserved_by = (SELECT auth.uid()))) WITH CHECK (user_id <> (SELECT auth.uid()) AND is_sold = false AND ((is_reserved = true AND reserved_by = (SELECT auth.uid())) OR (is_reserved = false AND reserved_by IS NULL)));
CREATE POLICY "Owners can delete textbooks" ON public.textbooks FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE OR REPLACE FUNCTION public.protect_textbook_reservation_updates() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') OR OLD.user_id = (SELECT auth.uid()) THEN RETURN NEW; END IF;
  IF OLD.is_sold IS DISTINCT FROM false THEN RAISE EXCEPTION 'Sold textbooks cannot be reserved'; END IF;
  IF (to_jsonb(NEW) - 'is_reserved' - 'reserved_by') IS DISTINCT FROM (to_jsonb(OLD) - 'is_reserved' - 'reserved_by') THEN RAISE EXCEPTION 'A buyer can only change reservation fields'; END IF;
  IF OLD.is_reserved = false THEN
    IF NEW.is_reserved IS DISTINCT FROM true OR NEW.reserved_by IS DISTINCT FROM (SELECT auth.uid()) THEN RAISE EXCEPTION 'A buyer can only reserve an available textbook for themselves'; END IF;
  ELSE
    IF OLD.reserved_by IS DISTINCT FROM (SELECT auth.uid()) OR NEW.is_reserved IS DISTINCT FROM false OR NEW.reserved_by IS NOT NULL THEN RAISE EXCEPTION 'Only the reservation owner can cancel a reservation'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_textbook_reservation_updates ON public.textbooks;
CREATE TRIGGER protect_textbook_reservation_updates BEFORE UPDATE ON public.textbooks FOR EACH ROW EXECUTE FUNCTION public.protect_textbook_reservation_updates();
