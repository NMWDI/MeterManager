export type PasswordEvaluation = {
  score: number;
  label: string;
  is_policy_compliant: boolean;
  missing_requirements: string[];
  compromised_count?: number | null;
  compromised_checked_at?: string | null;
  compromised_check_error?: string | null;
};

export type PasswordStatus = {
  password_changed_at?: string | null;
  password_strength_score?: number | null;
  password_strength_label?: string | null;
  password_policy_compliant?: boolean | null;
  password_compromised_checked_at?: string | null;
  password_compromised_count?: number | null;
};

export const MIN_PASSWORD_LENGTH = 12;

export function evaluatePasswordLocally(password: string): PasswordEvaluation {
  const missing_requirements: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    missing_requirements.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) {
    missing_requirements.push("Add a lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    missing_requirements.push("Add an uppercase letter.");
  }
  if (!/\d/.test(password)) {
    missing_requirements.push("Add a number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    missing_requirements.push("Add a symbol.");
  }

  let score = 0;
  score += Math.floor(Math.min(password.length, 16) / 4);
  score += /[a-z]/.test(password) ? 1 : 0;
  score += /[A-Z]/.test(password) ? 1 : 0;
  score += /\d/.test(password) ? 1 : 0;
  score += /[^A-Za-z0-9]/.test(password) ? 1 : 0;
  score += password.length >= 16 ? 1 : 0;
  score = Math.min(score, 5);

  if (missing_requirements.length > 0) {
    score = Math.min(score, 2);
  }

  return {
    score,
    label: score >= 5 ? "Strong" : score >= 3 ? "Moderate" : "Weak",
    is_policy_compliant: missing_requirements.length === 0,
    missing_requirements,
  };
}
