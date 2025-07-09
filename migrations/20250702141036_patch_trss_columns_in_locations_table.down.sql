-- Re-add TRSS-related columns to the locations table
ALTER TABLE locations
ADD COLUMN township INTEGER,
ADD COLUMN range INTEGER,
ADD COLUMN section INTEGER,
ADD COLUMN quarter INTEGER,
ADD COLUMN half_quarter INTEGER,
ADD COLUMN quarter_quarter INTEGER;

-- Populate the columns from the trss field
UPDATE locations
SET
    township = split_part(trss, '.', 1)::int,
    range = split_part(trss, '.', 2)::int,
    section = split_part(trss, '.', 3)::int,
    quarter = split_part(trss, '.', 4)::int
WHERE
    trss ~ '^\d+\.\d+\.\d+\.\d+$';
