ALTER TABLE public."Users"
  ADD COLUMN password_changed_at timestamp with time zone NULL,
  ADD COLUMN password_strength_score integer NULL,
  ADD COLUMN password_strength_label varchar NULL,
  ADD COLUMN password_policy_compliant boolean NULL,
  ADD COLUMN password_compromised_checked_at timestamp with time zone NULL,
  ADD COLUMN password_compromised_count integer NULL;
