-- Drop index first (safe cleanup)
DROP INDEX IF EXISTS idx_meter_activity_photos_activity_id;

-- Drop the MeterActivityPhotos table
DROP TABLE IF EXISTS public."MeterActivityPhotos";
