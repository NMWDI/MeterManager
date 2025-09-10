ALTER TABLE public."Users"
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS redirect_page,
  DROP COLUMN IF EXISTS avatar_img;
