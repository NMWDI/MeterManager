import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Autocomplete, Box, Stack, TextField } from "@mui/material";
import {
  Control,
  Controller,
  FieldValues,
  Path,
  UseFormSetValue,
} from "react-hook-form";
import { User } from "@/interfaces";
import { useGetUserList } from "@/service";
import { UserAvatar } from "@/components/UserAvatar";
import {
  getRoleLabel,
  sortUsersByRoleThenName,
} from "@/utils/UserRoleGrouping";

const getAvatarRole = (user: User | null | undefined) =>
  user ? getRoleLabel(user) : undefined;

const isUserLike = (value: unknown): value is User => {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return false;
  }

  return typeof value.id === "number" && Number.isFinite(value.id);
};

type ControlledUserSelectProps<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  hideAndSelectCurrentUser?: boolean;
  setValue?: UseFormSetValue<TFieldValues> | null;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  sx?: object;
};

export const ControlledUserSelect = ({
  name,
  control,
  hideAndSelectCurrentUser = false,
  setValue = null,
  ...childProps
}: ControlledUserSelectProps<FieldValues>) => {
  const [isCurrentUserSet, setIsCurrentUserSet] = useState<boolean>(false);
  const currentUser = useAuthUser();
  const userList = useGetUserList();
  const users = useMemo(
    () => sortUsersByRoleThenName(userList.data ?? []),
    [userList.data],
  );

  useEffect(() => {
    if (!hideAndSelectCurrentUser || isCurrentUserSet || !setValue) {
      return;
    }

    const authenticatedUser = currentUser();
    if (!authenticatedUser) {
      return;
    }

    setValue(name, authenticatedUser);
    setIsCurrentUserSet(true);
  }, [currentUser, hideAndSelectCurrentUser, isCurrentUserSet, name, setValue]);

  if (!hideAndSelectCurrentUser) {
    const {
      label = "User",
      error,
      helperText,
      disabled,
      sx,
      ...autocompleteProps
    } = childProps;

    return (
      <Controller
        name={name}
        control={control}
        defaultValue={null}
        render={({ field }) => (
          (() => {
            const fieldValue = isUserLike(field.value) ? field.value : null;
            const selectedUser =
              users.find((user) => user.id === fieldValue?.id) ??
              fieldValue ??
              null;

            return (
              <Autocomplete<User, false, false, false>
                {...autocompleteProps}
                {...field}
                size="small"
                options={users}
                groupBy={(user: User) => getRoleLabel(user)}
                getOptionLabel={(user: User) => user?.full_name ?? ""}
                isOptionEqualToValue={(option: User, value: User) =>
                  option.id === value.id
                }
                value={selectedUser}
                onChange={(_, newValue) => field.onChange(newValue)}
                loading={userList.isLoading}
                disabled={disabled ?? userList.isLoading}
                sx={sx}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <UserAvatar
                        full_name={option.full_name}
                        role={getAvatarRole(option)}
                        src={option.avatar_img ?? undefined}
                        size={30}
                      />
                      <Box component="span">{option.full_name}</Box>
                    </Stack>
                  </Box>
                )}
                renderInput={(params) => {
                  const { InputProps, ...rest } = params;
                  const startAdornment = selectedUser ? (
                    <>
                      <UserAvatar
                        full_name={selectedUser.full_name}
                        role={getAvatarRole(selectedUser)}
                        src={selectedUser.avatar_img ?? undefined}
                        size={20}
                        sx={{ mr: 0.75 }}
                      />
                      {InputProps.startAdornment}
                    </>
                  ) : InputProps.startAdornment;

                  return (
                    <TextField
                      {...rest}
                      label={label}
                      error={Boolean(error)}
                      helperText={error ?? helperText}
                      InputProps={{
                        ...InputProps,
                        ...(startAdornment
                          ? { startAdornment }
                          : {}),
                      }}
                    />
                  );
                }}
              />
            );
          })()
        )}
      />
    );
  } else {
    return null;
  }
};
