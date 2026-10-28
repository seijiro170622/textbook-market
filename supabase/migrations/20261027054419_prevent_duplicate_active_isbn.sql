ALTER TABLE public.textbooks ADD COLUMN IF NOT EXISTS isbn_normalized text GENERATED ALWAYS AS (NULLIF(regexp_replace(upper(COALESCE(isbn, '')), '[^0-9X]', '', 'g'), '')) STORED;
CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_isbn() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  normalized_isbn text;
BEGIN
  IF NEW.is_sold IS TRUE THEN RETURN NEW; END IF;
  normalized_isbn := NULLIF(regexp_replace(upper(COALESCE(NEW.isbn, '')), '[^0-9X]', '', 'g'), '');
  IF normalized_isbn IS NULL THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'ISBN is required for an active textbook listing'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_isbn, 0));
  IF EXISTS (SELECT 1 FROM public.textbooks AS existing WHERE existing.isbn_normalized = normalized_isbn AND existing.is_sold IS NOT TRUE AND existing.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'An active listing for this ISBN already exists';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_duplicate_active_isbn ON public.textbooks;
CREATE TRIGGER prevent_duplicate_active_isbn BEFORE INSERT OR UPDATE OF isbn, is_sold ON public.textbooks FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_active_isbn();
