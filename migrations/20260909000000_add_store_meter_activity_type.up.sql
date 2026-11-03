INSERT INTO public."ActivityTypeLU" (id, name, description, permission)
VALUES (13, 'Store Meter', 'Move meter into warehouse storage.', 'technician')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public."ActivityTypeLU_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."ActivityTypeLU";
