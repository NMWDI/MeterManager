-- 1. Add temp column to preserve original filename
ALTER TABLE public."MeterActivityPhotos"
ADD COLUMN original_file_name varchar;

-- 2. Store current file_name
UPDATE public."MeterActivityPhotos"
SET original_file_name = file_name;

-- 3. Update file_name using the last path segment of gcs_path
UPDATE public."MeterActivityPhotos"
SET file_name = split_part(gcs_path, '/', array_length(string_to_array(gcs_path, '/'), 1));
