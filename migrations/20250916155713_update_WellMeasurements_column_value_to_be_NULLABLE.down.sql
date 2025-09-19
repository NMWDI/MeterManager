-- 1. Replace all NULL values with zero
UPDATE public."WellMeasurements"
SET value = 0
WHERE value IS NULL;

-- 2. Reinstate NOT NULL constraint
ALTER TABLE public."WellMeasurements"
ALTER COLUMN value SET NOT NULL;
