-- Parse trss and populate township, range, section, quarter_quarter
UPDATE locations
SET
    township = split_part(trss, '.', 1)::int,
    range = split_part(trss, '.', 2)::int,
    section = split_part(trss, '.', 3)::int,
    quarter = split_part(trss, '.', 4)::int
WHERE
    trss ~ '^\d+\.\d+\.\d+\.\d+$';

