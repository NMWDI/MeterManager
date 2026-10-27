DELETE FROM public."ActivityTypeLU"
WHERE id = 13 AND name = 'Store Meter';

SELECT setval('public."ActivityTypeLU_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."ActivityTypeLU";
