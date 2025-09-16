-- 1. Drop NOT NULL constraint
ALTER TABLE public."WellMeasurements"
ALTER COLUMN value DROP NOT NULL;

-- 2. Replace all zero values with NULL
UPDATE public."WellMeasurements"
SET value = NULL
WHERE value = 0;
