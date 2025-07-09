-- Remove TRSS-related columns from the locations table
ALTER TABLE locations
DROP COLUMN IF EXISTS township,
DROP COLUMN IF EXISTS range,
DROP COLUMN IF EXISTS section,
DROP COLUMN IF EXISTS quarter,
DROP COLUMN IF EXISTS half_quarter,
DROP COLUMN IF EXISTS quarter_quarter;
