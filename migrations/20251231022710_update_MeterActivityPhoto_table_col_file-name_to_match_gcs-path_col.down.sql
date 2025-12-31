-- 1. Restore original file_name values
UPDATE public."MeterActivityPhotos"
SET file_name = original_file_name
WHERE original_file_name IS NOT NULL;

-- 2. Remove temp column
ALTER TABLE public."MeterActivityPhotos"
DROP COLUMN original_file_name;
