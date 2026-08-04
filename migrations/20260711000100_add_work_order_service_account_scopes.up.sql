WITH inserted_rows AS (
    INSERT INTO public."SecurityScopes"
        (id, scope_string, description)
    VALUES
        ('9', 'work_orders:read', 'Read work orders.'),
        ('10', 'work_orders:create', 'Create work orders.'),
        ('11', 'work_orders:update', 'Update work orders.')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
)
SELECT setval('public."SecurityScopes_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."SecurityScopes";

WITH inserted_rows AS (
    INSERT INTO public."UserRoles"
        (id, name)
    VALUES
        ('4', 'Service Account - Work Order Sync')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
)
SELECT setval('public."UserRoles_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."UserRoles";

INSERT INTO public."ScopesRoles"
    (security_scope_id, user_role_id, id)
VALUES
    ('9', '2', '17'),
    ('10', '2', '18'),
    ('11', '2', '19'),
    ('9', '1', '20'),
    ('11', '1', '21'),
    ('9', '4', '22'),
    ('10', '4', '23')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public."ScopesRoles_id_seq"', COALESCE(MAX(id), 1), TRUE)
FROM public."ScopesRoles";
