import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import {
  Add,
  Edit,
  Save,
  SaveAs,
  LockReset,
  ExpandMore,
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
} from "@/service";
import {
  ControlledTextbox,
  ControlledSelect,
  ControlledSelectNonObject,
  CustomCardHeader,
} from "@/components";
import { UpdatedUserPassword, User, UserRole } from "@/interfaces";
import { evaluatePasswordLocally } from "@/utils";

const UserResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
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

const formatSubmission = (user: User) => {
  let formattedUser = user;
  formattedUser.user_role_id = user.user_role?.id;
  delete formattedUser.user_role;
  return formattedUser;
};

const SetNewPasswordAccordion = ({
  control,
  errorMessage,
  handleSubmit,
}: any) => {
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
          <Grid item xs={12} xl>
            <ControlledTextbox
              name="password"
              control={control}
              label="New Password"
              error={errorMessage != undefined}
              helperText={errorMessage}
              sx={{ backgroundColor: "white" }}
            />
          </Grid>
          <Grid item xs={12} xl="auto">
            <Button color="primary" variant="contained" onClick={handleSubmit}>
              <LockReset sx={{ fontSize: "1.2rem" }} />
              &nbsp; Reset Password
            </Button>
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
      Object.entries(userQuery.data).forEach(([k, v]) => setValue(k as any, v));
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
  } = useForm<User>({
    resolver: yupResolver(UserResolverSchema),
  });

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

  const onErr = (data: any) => console.error("ERR: ", data);

  const updateUser = useUpdateUser(onSuccessfulUpdate);
  const createUser = useCreateUser(onSuccessfulCreate);
  const updateUserPassword = useUpdateUserPassword(onSuccessfulPasswordUpdate);

  const onSaveChanges = (user: User) =>
    updateUser.mutate(formatSubmission(user));

  const onCreateUser = (user: User) => {
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
