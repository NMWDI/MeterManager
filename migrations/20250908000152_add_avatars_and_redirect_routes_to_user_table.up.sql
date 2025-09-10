ALTER TABLE public."Users"
  ADD COLUMN display_name varchar NULL,
  ADD COLUMN redirect_page varchar NULL DEFAULT '/',
  ADD COLUMN avatar_img varchar NULL;

-- Initialize display_name to match full_name for existing users
UPDATE public."Users"
SET display_name = full_name
WHERE display_name IS NULL;
