import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import { Add, Edit, Save, SaveAs, Cancel } from "@mui/icons-material";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";
import { useFieldArray } from "react-hook-form";

import {
  useCreateRole,
  useGetSecurityScopes,
  useUpdateRole,
} from "@/service/ApiServiceNew";
import { ControlledTextbox, CustomCardHeader } from "@/components";
import { SecurityScope, UserRole } from "@/interfaces";

const RoleResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
  name: Yup.string().required("Please enter a name."),
});

interface RoleDetailsCardProps {
  selectedRole: UserRole | undefined;
  roleAddMode: boolean;
}

export const RoleDetailsCard = ({
  selectedRole,
  roleAddMode,
}: RoleDetailsCardProps) => {
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserRole>({
    resolver: yupResolver(RoleResolverSchema),
  });

  const { append, remove } = useFieldArray({
    control,
    name: "security_scopes",
  });

  const securityScopeList = useGetSecurityScopes();

  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated Role!", { variant: "success" });
  }
  function onSuccessfulCreate() {
    enqueueSnackbar("Successfully Created Role!", { variant: "success" });
    reset();
  }
  const createRole = useCreateRole(onSuccessfulCreate);
  const updateRole = useUpdateRole(onSuccessfulUpdate);

  const onSaveChanges: SubmitHandler<any> = (data) => updateRole.mutate(data);
  const onAddPart: SubmitHandler<any> = (data) => createRole.mutate(data);
  const onErr = (data: any) => console.log("ERR: ", data);

  // Populate the form with the selected role's details
  useEffect(() => {
    if (selectedRole != undefined) {
      reset();
      Object.entries(selectedRole).forEach(([field, value]) => {
        setValue(field as any, value);
      });
    }
  }, [selectedRole]);

  // Empty the form if entering role add mode
  useEffect(() => {
    if (roleAddMode) reset();
  }, [roleAddMode]);

  function removeSecurityScope(securityScopeIndex: number) {
    remove(securityScopeIndex);
  }

  function addSecurityScope(securityScopeID: number) {
    const newType = securityScopeList.data?.find(
      (x) => x.id === securityScopeID,
    );
    if (newType) append(newType);
  }

  // Determine if form is valid, {errors} in useEffect or formState's isValid don't work
  function hasErrors() {
    return Object.keys(errors).length > 0;
  }

  return (
    <Card>
      <CustomCardHeader
        title={roleAddMode ? "Create Role" : "Edit Role"}
        icon={roleAddMode ? Add : Edit}
      />
      <CardContent>
        <Grid container>
          <Grid container item xs={12} spacing={2}>
            <Grid container item>
              <Grid item xs={6}>
                <ControlledTextbox
                  name="name"
                  control={control}
                  label="Role Name"
                  error={errors?.name?.message != undefined}
                  helperText={errors?.name?.message}
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Permissions</InputLabel>
                  <Select
                    multiple
                    value={watch("security_scopes") ?? []}
                    onChange={(event: any) =>
                      addSecurityScope(
                        event.target.value[event.target.value.length - 1],
                      )
                    }
                    input={<OutlinedInput label="Permissions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value, index) => (
                          <Chip
                            key={value.id}
                            label={value.scope_string}
                            clickable
                            deleteIcon={
                              <Cancel
                                onMouseDown={(event: any) =>
                                  event.stopPropagation()
                                }
                              />
                            }
                            onDelete={() => removeSecurityScope(index)}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {/* Scope list (with selected scopes filtered out)  */}
                    {securityScopeList.data
                      ?.filter(
                        (x) =>
                          !watch("security_scopes")
                            ?.map((scope) => scope.id)
                            .includes(x.id),
                      )
                      .map((scope: SecurityScope) => (
                        <MenuItem key={scope.id} value={scope.id}>
                          {scope.scope_string}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
          <Grid container item xs={12} sx={{ mt: 2 }}>
            {hasErrors() ? (
              <Alert severity="error" sx={{ width: "50%" }}>
                Please correct any errors before submission.
              </Alert>
            ) : roleAddMode ? (
              <Button
                color="success"
                variant="contained"
                onClick={handleSubmit(onAddPart, onErr)}
              >
                <Save sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save New Role
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
        </Grid>
      </CardContent>
    </Card>
  );
};
