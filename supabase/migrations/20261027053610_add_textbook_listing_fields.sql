ALTER TABLE public.textbooks
  ADD COLUMN IF NOT EXISTS course_type text,
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS writing_type text,
  ADD COLUMN IF NOT EXISTS writing_amount text,
  ADD COLUMN IF NOT EXISTS physical_damage text,
  ADD COLUMN IF NOT EXISTS stain_water_damage text,
  ADD COLUMN IF NOT EXISTS accessories_status text;
