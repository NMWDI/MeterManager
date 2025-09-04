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
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import LockResetIcon from "@mui/icons-material/LockReset";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";

import {
  useCreateUser,
  useUpdateUser,
  useGetRoles,
  useUpdateUserPassword,
} from "../../service/ApiServiceNew";
import ControlledTextbox from "../../components/RHControlled/ControlledTextbox";
import { UpdatedUserPassword, User, UserRole } from "../../interfaces";
import {
  ControlledSelect,
  ControlledSelectNonObject,
} from "../../components/RHControlled/ControlledSelect";
import { CustomCardHeader } from "../../components/CustomCardHeader";

const UserResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
  username: Yup.string().required("Please enter a username."),
  full_name: Yup.string().required("Please enter a full name."),
  email: Yup.string().required("Please enter an email."),
  disabled: Yup.boolean().required("Please indicate if user is active."),
  user_role: Yup.object().required("Please indicate the users role."),
  password: Yup.string(),
});

// Format the submission as the backend schema specifies
function formatSubmission(user: User) {
  let formattedUser = user;
  formattedUser.user_role_id = user.user_role?.id;
  delete formattedUser.user_role;
  return formattedUser;
}

function SetNewPasswordAccordion({ control, errorMessage, handleSubmit }: any) {
  return (
    <Accordion sx={{ backgroundColor: "#e6e6e6" }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ m: 0, ml: 1, mr: 1, p: 0, color: "#595959" }}
      >
        <LockResetIcon style={{ fontSize: "1.2rem", marginTop: "2px" }} />{" "}
        &nbsp;
        <Typography>Set New Password for User</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <ControlledTextbox
              name="password"
              control={control}
              label="New Password"
              error={errorMessage != undefined}
              helperText={errorMessage}
              sx={{ backgroundColor: "white" }}
            />
          </Grid>
          <Grid item xs={6}>
            <Button color="primary" variant="contained" onClick={handleSubmit}>
              <LockResetIcon sx={{ fontSize: "1.2rem" }} />
              &nbsp; Set Password
            </Button>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

interface UserDetailsCardProps {
  selectedUser: User | undefined;
  userAddMode: boolean;
}

// Handles adding, updating and changing the password of a user
// If updating a user password, a special endpoint is called
// When updating or creating a user, the values are validated, then the submit handler is called
// Any validation not in the validation schema must be checked in the submit handler
export const UserDetailsCard = ({
  selectedUser,
  userAddMode,
}: UserDetailsCardProps) => {
  const rolesList = useGetRoles();

  // React hook form for user field values
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

  // Submission callbacks
  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated User!", { variant: "success" });
  }
  function onSuccessfulPasswordUpdate() {
    enqueueSnackbar("Successfully Updated User's Password!", {
      variant: "success",
    });
  }
  function onSuccessfulCreate() {
    enqueueSnackbar("Successfully Created New User!", { variant: "success" });
    reset();
  }
  const onErr = (data: any) => console.error("ERR: ", data);

  const updateUser = useUpdateUser(onSuccessfulUpdate);
  const createUser = useCreateUser(onSuccessfulCreate);
  const updateUserPassword = useUpdateUserPassword(onSuccessfulPasswordUpdate);

  // Submit handlers
  function onSaveChanges(user: User) {
    updateUser.mutate(formatSubmission(user));
  }

  function onCreateUser(user: User) {
    if (!user.password || user.password.length < 1) {
      enqueueSnackbar("Please provide a password.", { variant: "error" });
      return;
    }
    createUser.mutate(formatSubmission(user));
  }

  function onUpdateUserPassword(
    userId: number,
    newPassword: string | undefined,
  ) {
    if (!newPassword || newPassword.length < 1) {
      enqueueSnackbar("Please provide a new password.", { variant: "error" });
      return;
    }
    const updatedUserPassword: UpdatedUserPassword = {
      user_id: userId,
      new_password: newPassword,
    };
    updateUserPassword.mutate(updatedUserPassword);
  }

  // Populate the form with the selected user's details
  useEffect(() => {
    if (selectedUser != undefined) {
      reset();
      Object.entries(selectedUser).forEach(([field, value]) => {
        setValue(field as any, value);
      });
    }
  }, [selectedUser]);

  // Empty the form if entering user add mode
  useEffect(() => {
    if (userAddMode) reset();
  }, [userAddMode]);

  // Determine if form is valid, {errors} in useEffect or formState's isValid don't work
  const hasErrors = () => Object.keys(errors).length > 0;

  return (
    <Card>
      <CustomCardHeader
        title={userAddMode ? "Create User" : "Edit User"}
        icon={userAddMode ? AddIcon : EditIcon}
      />
      <CardContent>
        <Grid container>
          <Grid container item xs={12} spacing={2}>
            <Grid container item>
              <Grid item xs={6}>
                <ControlledTextbox
                  name="full_name"
                  control={control}
                  label="Full Name"
                  error={errors?.full_name?.message != undefined}
                  helperText={errors?.full_name?.message}
                />
              </Grid>
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

            {/* Show 'Set New Password for User' accordion if editing a user, show regular textfield if adding user */}
            <Grid item xs={12} sx={{ mt: 2, mb: 1 }}>
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
                <SaveIcon sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save New User
              </Button>
            ) : (
              <Button
                color="success"
                variant="contained"
                onClick={handleSubmit(onSaveChanges, onErr)}
              >
                <SaveAsIcon sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save Changes
              </Button>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
