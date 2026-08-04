import { useEffect, useState } from "react";
import { Control, Resolver, useForm, useWatch } from "react-hook-form";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  Add,
  AutoFixHigh,
  Edit,
  Save,
  SaveAs,
  LockReset,
  ExpandMore,
  Visibility,
  VisibilityOff,
  ContentCopy,
} from "@mui/icons-material";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";

import {
  useCreateUser,
  useUpdateUser,
  useGetRoles,
  useUpdateUserPassword,
  useGetUser,
  useGenerateUserPassword,
} from "@/service";
import {
  ControlledTextbox,
  ControlledSelect,
  ControlledSelectNonObject,
  CustomCardHeader,
} from "@/components";
import { UpdatedUserPassword, User, UserRole } from "@/interfaces";
import { evaluatePasswordLocally } from "@/utils";

type UserFormValues = User;

const UserResolverSchema = Yup.object().shape({
  full_name: Yup.string().required("Please enter a full name."),
  display_name: Yup.string().required("Please enter a display name."),
  username: Yup.string().required("Please enter a username."),
  email: Yup.string().required("Please enter an email."),
  disabled: Yup.boolean().required("Please indicate if user is active."),
  user_role: Yup.object().required("Please indicate the users role."),
  password: Yup.string().test(
    "password-policy",
    "Password does not meet password requirements.",
    (value) => !value || evaluatePasswordLocally(value).is_policy_compliant,
  ),
});

const formatSubmission = (user: UserFormValues) => {
  const formattedUser = { ...user };
  formattedUser.user_role_id = user.user_role?.id;
  delete formattedUser.user_role;
  return formattedUser;
};

const passwordRequirementLabels = [
  "Use at least 12 characters.",
  "Add a lowercase letter.",
  "Add an uppercase letter.",
  "Add a number.",
  "Add a symbol.",
];

const userResolver = yupResolver(
  UserResolverSchema,
) as unknown as Resolver<UserFormValues>;

const SetNewPasswordAccordion = ({
  control,
  errorMessage,
  handleSubmit,
  handleGeneratePassword,
  handleCopyPassword,
  isGeneratingPassword,
}: {
  control: Control<UserFormValues>;
  errorMessage?: string;
  handleSubmit: () => void;
  handleGeneratePassword: () => void;
  handleCopyPassword: () => void;
  isGeneratingPassword: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const password = useWatch({ control, name: "password" }) ?? "";
  const evaluation = evaluatePasswordLocally(password);
  const strengthColor =
    evaluation.score >= 5
      ? "success"
      : evaluation.score >= 3
        ? "warning"
        : "error";

  return (
    <Accordion sx={{ backgroundColor: "#f0f0f0" }}>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{ m: 0, mx: 2, p: 0, color: "#595959" }}
      >
        <LockReset style={{ fontSize: "1.2rem", marginTop: "2px" }} /> &nbsp;
        <Typography>Set New Password for User</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack spacing={1}>
              <ControlledTextbox
                name="password"
                control={control}
                label="New Password"
                type={showPassword ? "text" : "password"}
                error={errorMessage != undefined}
                helperText={errorMessage}
                sx={{ backgroundColor: "white" }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((current) => !current)}
                        edge="end"
                        sx={{ mr: 1 }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={handleCopyPassword}
                        disabled={!password}
                        edge="end"
                      >
                        <ContentCopy />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {password ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Password strength: {evaluation.label}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(evaluation.score / 5) * 100}
                    color={strengthColor}
                  />
                </Box>
              ) : null}
              <Stack spacing={0.25}>
                {passwordRequirementLabels.map((requirement) => {
                  const isMissing =
                    !password ||
                    evaluation.missing_requirements.includes(requirement);
                  return (
                    <Typography
                      key={requirement}
                      variant="caption"
                      color={isMissing ? "text.secondary" : "success.main"}
                    >
                      {isMissing ? "[ ]" : "[x]"} {requirement}
                    </Typography>
                  );
                })}
                <Typography variant="caption" color="text.secondary">
                  Passwords are checked against known compromised password lists
                  before they are saved.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                color="primary"
                variant="outlined"
                onClick={handleGeneratePassword}
                disabled={isGeneratingPassword}
              >
                <AutoFixHigh sx={{ fontSize: "1.2rem" }} />
                &nbsp;
                {isGeneratingPassword ? "Generating..." : "Generate Password"}
              </Button>
              <Button
                color="primary"
                variant="contained"
                onClick={handleSubmit}
              >
                <LockReset sx={{ fontSize: "1.2rem" }} />
                &nbsp; Reset Password
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export const UserDetailsCard = ({
  userId,
  userAddMode,
}: {
  userId?: number;
  userAddMode: boolean;
}) => {
  const userQuery = useGetUser(userId!, { enabled: !!userId && !userAddMode });

  useEffect(() => {
    if (!userAddMode && userQuery.data) {
      reset();
      Object.entries(userQuery.data).forEach(([k, v]) =>
        setValue(k as keyof UserFormValues, v as never),
      );
    }
    if (userAddMode) reset();
  }, [userAddMode, userQuery.data]);

  const rolesList = useGetRoles();
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
    clearErrors,
  } = useForm<UserFormValues>({ resolver: userResolver });

  const onSuccessfulUpdate = () =>
    enqueueSnackbar("Successfully Updated User!", { variant: "success" });
  const onSuccessfulPasswordUpdate = () =>
    enqueueSnackbar("Successfully Updated User's Password!", {
      variant: "success",
    });
  const onSuccessfulCreate = () => {
    enqueueSnackbar("Successfully Created New User!", { variant: "success" });
    reset();
  };

  const onErr = (data: unknown) => console.error("ERR: ", data);

  const updateUser = useUpdateUser(onSuccessfulUpdate);
  const createUser = useCreateUser(onSuccessfulCreate);
  const updateUserPassword = useUpdateUserPassword(onSuccessfulPasswordUpdate);
  const generateUserPassword = useGenerateUserPassword();

  const onSaveChanges = (user: UserFormValues) =>
    updateUser.mutate(formatSubmission(user));

  const onCreateUser = (user: UserFormValues) => {
    if (!user.password || user.password.length < 1) {
      enqueueSnackbar("Please provide a password.", { variant: "error" });
      return;
    }
    const evaluation = evaluatePasswordLocally(user.password);
    if (!evaluation.is_policy_compliant) {
      enqueueSnackbar(evaluation.missing_requirements[0], { variant: "error" });
      return;
    }
    createUser.mutate(formatSubmission(user));
  };

  const onUpdateUserPassword = (
    userId: number,
    newPassword: string | undefined,
  ) => {
    if (!newPassword || newPassword.length < 1) {
      enqueueSnackbar("Please provide a new password.", { variant: "error" });
      return;
    }
    const evaluation = evaluatePasswordLocally(newPassword);
    if (!evaluation.is_policy_compliant) {
      enqueueSnackbar(evaluation.missing_requirements[0], { variant: "error" });
      return;
    }
    const updatedUserPassword: UpdatedUserPassword = {
      user_id: userId,
      new_password: newPassword,
    };
    updateUserPassword.mutate(updatedUserPassword);
  };

  const onGeneratePassword = () => {
    const selectedUserId = watch("id");
    if (!selectedUserId) {
      enqueueSnackbar("Select a user before generating a password.", {
        variant: "error",
      });
      return;
    }

    generateUserPassword.mutate(selectedUserId, {
      onSuccess: ({ password }) => {
        setValue("password", password, {
          shouldDirty: true,
          shouldValidate: true,
        });
        clearErrors("password");
        enqueueSnackbar("Generated a new strong password.", {
          variant: "success",
        });
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate password.";
        enqueueSnackbar(message, { variant: "error" });
      },
    });
  };

  const onCopyPassword = async () => {
    const password = watch("password");
    if (!password) {
      enqueueSnackbar("No password to copy.", { variant: "info" });
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      enqueueSnackbar("Password copied.", { variant: "success" });
    } catch {
      enqueueSnackbar("Unable to copy password.", { variant: "error" });
    }
  };

  useEffect(() => {
    if (userAddMode) reset();
  }, [userAddMode]);

  const hasErrors = () => Object.keys(errors).length > 0;

  return (
    <Card>
      <CustomCardHeader
        title={userAddMode ? "Create User" : "Edit User"}
        icon={userAddMode ? Add : Edit}
      />
      <CardContent>
        <Grid container item xs={12} spacing={2}>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              name="full_name"
              control={control}
              label="Full Name"
              error={errors?.full_name?.message != undefined}
              helperText={errors?.full_name?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              disabled={!userAddMode}
              sx={{ cursor: !userAddMode ? "not-allowed" : null }}
              name="display_name"
              control={control}
              label="Display Name"
              error={errors?.display_name?.message != undefined}
              helperText={errors?.display_name?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              name="username"
              control={control}
              label="Username"
              error={errors?.username?.message != undefined}
              helperText={errors?.username?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              name="email"
              control={control}
              label="Email"
              error={errors?.email?.message != undefined}
              helperText={errors?.email?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledSelectNonObject
              name="disabled"
              control={control}
              label="Active"
              options={[false, true]}
              getOptionLabel={(label: boolean) => (label ? "False" : "True")}
              error={errors?.disabled?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledSelect
              name="user_role"
              label="Role"
              options={rolesList.data ?? []}
              getOptionLabel={(role: UserRole) => role.name}
              control={control}
              error={errors?.user_role?.message}
            />
          </Grid>
          <Grid item xs={12}>
            {userAddMode ? (
              <ControlledTextbox
                name="password"
                control={control}
                label="Password"
                error={errors?.password?.message != undefined}
                helperText={errors?.password?.message}
              />
            ) : (
              <SetNewPasswordAccordion
                control={control}
                errorMessage={errors?.password?.message}
                handleSubmit={() =>
                  onUpdateUserPassword(watch("id"), watch("password"))
                }
                handleGeneratePassword={onGeneratePassword}
                handleCopyPassword={onCopyPassword}
                isGeneratingPassword={generateUserPassword.isLoading}
              />
            )}
          </Grid>
        </Grid>
        <Grid container item xs={12} sx={{ mt: 2 }}>
          {hasErrors() ? (
            <Alert severity="error" sx={{ width: "50%" }}>
              Please correct any errors before submission.
            </Alert>
          ) : userAddMode ? (
            <Button
              color="success"
              variant="contained"
              onClick={handleSubmit(onCreateUser, onErr)}
            >
              <Save sx={{ fontSize: "1.2rem" }} />
              &nbsp; Save New User
            </Button>
          ) : (
            <Button
              color="success"
              variant="contained"
              onClick={handleSubmit(onSaveChanges, onErr)}
            >
              <SaveAs sx={{ fontSize: "1.2rem" }} />
              &nbsp; Save Changes
            </Button>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};
