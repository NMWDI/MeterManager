DELETE FROM public."ScopesRoles"
WHERE id IN ('17', '18', '19', '20', '21', '22', '23');

DELETE FROM public."UserRoles"
WHERE id = '4'
    AND name = 'Service Account - Work Order Sync'
    AND NOT EXISTS (
        SELECT 1
        FROM public."Users"
        WHERE user_role_id = 4
    );

DELETE FROM public."SecurityScopes"
WHERE id IN ('9', '10', '11')
    AND scope_string IN (
        'work_orders:read',
        'work_orders:create',
        'work_orders:update'
    );

SELECT setval('public."ScopesRoles_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."ScopesRoles";

SELECT setval('public."UserRoles_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."UserRoles";

SELECT setval('public."SecurityScopes_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."SecurityScopes";
