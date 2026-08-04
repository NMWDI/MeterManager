import { useEffect, useMemo, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  ContentCopy,
  DeleteOutline,
  Edit,
  Key,
  Save,
  SaveAs,
} from "@mui/icons-material";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";

import {
  useCreateServiceAccount,
  useCreateServiceAccountKey,
  useGetRoles,
  useGetServiceAccounts,
  useRevokeServiceAccountKey,
  useUpdateServiceAccount,
} from "@/service";
import {
  ControlledSelect,
  ControlledSelectNonObject,
  ControlledTextbox,
  CustomCardHeader,
  IsTrueChip,
} from "@/components";
import {
  ServiceAccount,
  ServiceAccountApiKey,
  ServiceAccountForm,
  UserRole,
} from "@/interfaces";
import { toGMT6String } from "@/utils";

const ServiceAccountResolverSchema = Yup.object().shape({
  full_name: Yup.string().required("Please enter a name."),
  username: Yup.string().required("Please enter an identifier."),
  disabled: Yup.boolean().required("Please indicate if account is active."),
  user_role: Yup.object().required("Please indicate the account role."),
});

const serviceAccountResolver = yupResolver(
  ServiceAccountResolverSchema,
) as unknown as Resolver<ServiceAccountForm>;

const formatDateTime = (value?: string | null) =>
  value ? toGMT6String(new Date(value)) : "-";

const formatSubmission = (
  serviceAccount: ServiceAccountForm,
  serviceAccountAddMode: boolean,
) => {
  const formattedServiceAccount: ServiceAccountForm = {
    id: serviceAccount.id,
    full_name: serviceAccount.full_name,
    display_name: serviceAccount.display_name,
    disabled: serviceAccount.disabled,
    user_role_id: serviceAccount.user_role?.id,
  };

  if (serviceAccountAddMode) {
    formattedServiceAccount.username = serviceAccount.username;
  }

  return formattedServiceAccount;
};

const ApiKeyRows = ({
  serviceAccountId,
  apiKeys,
  revokeKey,
}: {
  serviceAccountId?: number;
  apiKeys: ServiceAccountApiKey[];
  revokeKey: ReturnType<typeof useRevokeServiceAccountKey>;
}) => {
  if (!serviceAccountId || apiKeys.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No keys have been created.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Prefix</TableCell>
          <TableCell>Created</TableCell>
          <TableCell>Last Used</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {apiKeys.map((apiKey) => {
          const isRevoked = !!apiKey.revoked_at;
          return (
            <TableRow key={apiKey.key_identifier}>
              <TableCell>{apiKey.key_prefix}...</TableCell>
              <TableCell>{formatDateTime(apiKey.created_at)}</TableCell>
              <TableCell>{formatDateTime(apiKey.last_used_at)}</TableCell>
              <TableCell>
                <IsTrueChip assert={!isRevoked} />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Revoke key">
                  <span>
                    <IconButton
                      color="error"
                      size="small"
                      disabled={isRevoked || revokeKey.isLoading}
                      onClick={() => {
                        if (!window.confirm("Revoke this service account key?")) {
                          return;
                        }
                        revokeKey.mutate({
                          serviceAccountId,
                          keyIdentifier: apiKey.key_identifier,
                        });
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export const ServiceAccountDetailsCard = ({
  serviceAccountId,
  serviceAccountAddMode,
}: {
  serviceAccountId?: number;
  serviceAccountAddMode: boolean;
}) => {
  const [latestApiKey, setLatestApiKey] = useState("");
  const serviceAccounts = useGetServiceAccounts();
  const selectedServiceAccount = useMemo(
    () =>
      (serviceAccounts.data ?? []).find(
        (serviceAccount) => serviceAccount.id === serviceAccountId,
      ),
    [serviceAccountId, serviceAccounts.data],
  );
  const rolesList = useGetRoles();
  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceAccountForm>({ resolver: serviceAccountResolver });

  useEffect(() => {
    setLatestApiKey("");
    if (!serviceAccountAddMode && selectedServiceAccount) {
      reset();
      Object.entries(selectedServiceAccount).forEach(([k, v]) =>
        setValue(k as keyof ServiceAccountForm, v as never),
      );
    }
    if (serviceAccountAddMode) {
      reset({ disabled: false });
    }
  }, [serviceAccountAddMode, selectedServiceAccount, reset, setValue]);

  const onSuccessfulCreate = (serviceAccount: ServiceAccount) => {
    enqueueSnackbar("Successfully created service account.", {
      variant: "success",
    });
    setLatestApiKey(serviceAccount.api_key ?? "");
  };

  const onSuccessfulUpdate = () =>
    enqueueSnackbar("Successfully updated service account.", {
      variant: "success",
    });

  const onSuccessfulKeyCreate = (serviceAccount: ServiceAccount) => {
    enqueueSnackbar("Created a new service account key.", {
      variant: "success",
    });
    setLatestApiKey(serviceAccount.api_key ?? "");
  };

  const createServiceAccount = useCreateServiceAccount(onSuccessfulCreate);
  const updateServiceAccount = useUpdateServiceAccount(onSuccessfulUpdate);
  const createKey = useCreateServiceAccountKey(onSuccessfulKeyCreate);
  const revokeKey = useRevokeServiceAccountKey(() =>
    enqueueSnackbar("Revoked service account key.", { variant: "success" }),
  );

  const onSaveChanges = (serviceAccount: ServiceAccountForm) =>
    updateServiceAccount.mutate(
      formatSubmission(serviceAccount, serviceAccountAddMode),
    );

  const onCreateServiceAccount = (serviceAccount: ServiceAccountForm) =>
    createServiceAccount.mutate(
      formatSubmission(serviceAccount, serviceAccountAddMode),
    );

  const onCopyLatestKey = async () => {
    if (!latestApiKey) {
      enqueueSnackbar("No API key to copy.", { variant: "info" });
      return;
    }

    try {
      await navigator.clipboard.writeText(latestApiKey);
      enqueueSnackbar("API key copied.", { variant: "success" });
    } catch {
      enqueueSnackbar("Unable to copy API key.", { variant: "error" });
    }
  };

  const sortedApiKeys = [...(selectedServiceAccount?.api_keys ?? [])].sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );

  return (
    <Card>
      <CustomCardHeader
        title={
          serviceAccountAddMode
            ? "Create Service Account"
            : "Edit Service Account"
        }
        icon={serviceAccountAddMode ? Add : Edit}
      />
      <CardContent>
        <Grid container item xs={12} spacing={2}>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              name="full_name"
              control={control}
              label="Name"
              error={errors?.full_name?.message != undefined}
              helperText={errors?.full_name?.message}
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              name="display_name"
              control={control}
              label="Display Name"
            />
          </Grid>
          <Grid item xs={12} xl={6}>
            <ControlledTextbox
              disabled={!serviceAccountAddMode}
              sx={{ cursor: !serviceAccountAddMode ? "not-allowed" : null }}
              name="username"
              control={control}
              label="Identifier"
              error={errors?.username?.message != undefined}
              helperText={errors?.username?.message}
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
          <Grid item xs={12}>
            <ControlledSelect
              name="user_role"
              label="Role"
              options={rolesList.data ?? []}
              getOptionLabel={(role: UserRole) => role.name}
              control={control}
              error={errors?.user_role?.message}
            />
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 2 }}
        >
          {serviceAccountAddMode ? (
            <Button
              color="success"
              variant="contained"
              disabled={createServiceAccount.isLoading}
              onClick={handleSubmit(onCreateServiceAccount)}
            >
              <Save sx={{ fontSize: "1.2rem" }} />
              &nbsp; Save New Account
            </Button>
          ) : (
            <>
              <Button
                color="success"
                variant="contained"
                disabled={updateServiceAccount.isLoading}
                onClick={handleSubmit(onSaveChanges)}
              >
                <SaveAs sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save Changes
              </Button>
              <Button
                color="primary"
                variant="outlined"
                disabled={!selectedServiceAccount?.id || createKey.isLoading}
                onClick={() =>
                  selectedServiceAccount?.id &&
                  createKey.mutate(selectedServiceAccount.id)
                }
              >
                <Key sx={{ fontSize: "1.2rem" }} />
                &nbsp; New Key
              </Button>
            </>
          )}
        </Stack>

        {latestApiKey ? (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<ContentCopy />}
                onClick={onCopyLatestKey}
              >
                Copy
              </Button>
            }
          >
            <Stack spacing={1}>
              <Typography variant="body2">
                API key created. Store it now.
              </Typography>
              <TextField
                value={latestApiKey}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Stack>
          </Alert>
        ) : null}

        {!serviceAccountAddMode ? (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              API Keys
            </Typography>
            <ApiKeyRows
              serviceAccountId={selectedServiceAccount?.id}
              apiKeys={sortedApiKeys}
              revokeKey={revokeKey}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
};
