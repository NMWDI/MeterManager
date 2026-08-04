ALTER TABLE public."Users"
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS password_strength_score,
  DROP COLUMN IF EXISTS password_strength_label,
  DROP COLUMN IF EXISTS password_policy_compliant,
  DROP COLUMN IF EXISTS password_compromised_checked_at,
  DROP COLUMN IF EXISTS password_compromised_count;
