import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  PasswordEvaluation,
  PasswordStatus,
  evaluatePasswordLocally,
  toGMT6String,
} from "@/utils";
import { SectionSurface } from "./SectionSurface";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function SecuritySection({
  passwordControl,
  passwordErrors,
  handlePasswordSubmit,
  onPasswordSubmit,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isSavingPassword,
  passwordStatus,
  passwordEvaluation,
  checkedPassword,
  isCheckingPassword,
  onNewPasswordBlur,
}: {
  passwordControl: Control<PasswordFormValues>;
  passwordErrors: FieldErrors<PasswordFormValues>;
  handlePasswordSubmit: (
    callback: (data: PasswordFormValues) => void,
  ) => React.FormEventHandler<HTMLFormElement>;
  onPasswordSubmit: (data: PasswordFormValues) => void;
  showCurrentPassword: boolean;
  setShowCurrentPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showNewPassword: boolean;
  setShowNewPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingPassword: boolean;
  passwordStatus?: PasswordStatus;
  passwordEvaluation?: PasswordEvaluation;
  checkedPassword?: string;
  isCheckingPassword: boolean;
  onNewPasswordBlur: (password: string) => void;
}) {
  const newPassword = useWatch({
    control: passwordControl,
    name: "newPassword",
  });
  const localEvaluation = evaluatePasswordLocally(newPassword ?? "");
  const isShowingCheckedPassword = checkedPassword === newPassword;
  const displayEvaluation =
    isShowingCheckedPassword && passwordEvaluation
      ? passwordEvaluation
      : localEvaluation;
  const strengthColor =
    localEvaluation.score >= 5
      ? "success"
      : localEvaluation.score >= 3
        ? "warning"
        : "error";
  const passwordChangedAt = passwordStatus?.password_changed_at
    ? toGMT6String(new Date(passwordStatus.password_changed_at))
    : "Not recorded";
  const currentPasswordIsWeak = passwordStatus?.password_policy_compliant === false;
  const currentPasswordIsCompromised =
    (passwordStatus?.password_compromised_count ?? 0) > 0;

  return (
    <SectionSurface title="Change password">
      <Box component="form" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Password last changed: {passwordChangedAt}
            </Typography>
            {currentPasswordIsWeak || currentPasswordIsCompromised ? (
              <Alert severity="warning">
                Your current password is{" "}
                {currentPasswordIsCompromised
                  ? "known to be compromised"
                  : "weaker than the current policy"}
                . Update it with a strong password when you can.
              </Alert>
            ) : passwordStatus?.password_policy_compliant == null ? (
              <Alert severity="info">
                Current password strength has not been checked yet.
              </Alert>
            ) : null}
          </Stack>
          <Controller
            name="currentPassword"
            control={passwordControl}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Current password"
                type={showCurrentPassword ? "text" : "password"}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setShowCurrentPassword((current) => !current)
                        }
                        edge="end"
                      >
                        {showCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          <Controller
            name="newPassword"
            control={passwordControl}
            render={({ field }) => (
              <Stack spacing={0.75}>
                <TextField
                  {...field}
                  size="small"
                  label="New password"
                  type={showNewPassword ? "text" : "password"}
                  error={!!passwordErrors.newPassword}
                  helperText={
                    passwordErrors.newPassword?.message ||
                    displayEvaluation.missing_requirements[0]
                  }
                  onBlur={() => {
                    field.onBlur();
                    onNewPasswordBlur(field.value);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setShowNewPassword((current) => !current)
                          }
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {newPassword ? (
                  <Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Password strength: {localEvaluation.label}
                      </Typography>
                      {isCheckingPassword ? (
                        <Typography variant="caption" color="text.secondary">
                          Checking compromised lists...
                        </Typography>
                      ) : isShowingCheckedPassword &&
                        displayEvaluation.compromised_count != null ? (
                        <Typography
                          variant="caption"
                          color={
                            displayEvaluation.compromised_count > 0
                              ? "error"
                              : "success.main"
                          }
                        >
                          {displayEvaluation.compromised_count > 0
                            ? "Found in compromised lists"
                            : "No compromised match found"}
                        </Typography>
                      ) : null}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(localEvaluation.score / 5) * 100}
                      color={strengthColor}
                    />
                  </Box>
                ) : null}
              </Stack>
            )}
          />
          <Controller
            name="confirmPassword"
            control={passwordControl}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Confirm new password"
                type={showConfirmPassword ? "text" : "password"}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          <Box>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={isSavingPassword}
            >
              Update password
            </Button>
          </Box>
        </Stack>
      </Box>
    </SectionSurface>
  );
}
