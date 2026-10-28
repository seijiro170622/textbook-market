alter table public.textbooks
  add column if not exists isbn text,
  add column if not exists publisher text,
  add column if not exists list_price integer,
  add column if not exists course_type text,
  add column if not exists course_name text,
  add column if not exists writing_type text,
  add column if not exists writing_amount text,
  add column if not exists physical_damage text,
  add column if not exists stain_water_damage text,
  add column if not exists accessories_status text;