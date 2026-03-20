import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
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
}) {
  return (
    <SectionSurface title="Change password">
      <Box component="form" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
        <Stack spacing={1.5}>
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
              <TextField
                {...field}
                size="small"
                label="New password"
                type={showNewPassword ? "text" : "password"}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword?.message}
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
