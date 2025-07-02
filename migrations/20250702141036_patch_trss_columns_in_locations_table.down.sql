-- Clear the trss columns values
UPDATE locations
SET
    township = NULL,
    range = NULL,
    section = NULL,
    quarter = NULL
WHERE
    trss ~ '^\d+\.\d+\.\d+\.\d+$';
