import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Autocomplete, Box, Chip, Stack, TextField } from "@mui/material";
import {
  Control,
  Controller,
  FieldValues,
  Path,
  PathValue,
  UseControllerProps,
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

const getUserId = (value: unknown): number | undefined =>
  isUserLike(value) ? value.id : undefined;

type ControlledUserSelectProps<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  hideAndSelectCurrentUser?: boolean;
  setValue?: UseFormSetValue<TFieldValues> | null;
  options?: User[];
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  sx?: object;
  multiple?: boolean;
};

export const ControlledUserSelect = <TFieldValues extends FieldValues>({
  name,
  control,
  hideAndSelectCurrentUser = false,
  setValue = null,
  ...childProps
}: ControlledUserSelectProps<TFieldValues>) => {
  const [isCurrentUserSet, setIsCurrentUserSet] = useState<boolean>(false);
  const currentUser = useAuthUser();
  const userList = useGetUserList();
  const providedOptions = Array.isArray(childProps.options)
    ? childProps.options
    : undefined;
  const users = useMemo(
    () => sortUsersByRoleThenName(providedOptions ?? userList.data ?? []),
    [providedOptions, userList.data],
  );

  useEffect(() => {
    if (!hideAndSelectCurrentUser || isCurrentUserSet || !setValue) {
      return;
    }

    const authenticatedUser = currentUser();
    if (!authenticatedUser) {
      return;
    }

    setValue(name, authenticatedUser as PathValue<TFieldValues, Path<TFieldValues>>);
    setIsCurrentUserSet(true);
  }, [currentUser, hideAndSelectCurrentUser, isCurrentUserSet, name, setValue]);

  if (!hideAndSelectCurrentUser) {
    const {
      label = "User",
      error,
      helperText,
      disabled,
      sx,
      multiple = false,
      ...autocompleteProps
    } = childProps;

    return (
      <Controller
        name={name}
        control={control}
        defaultValue={null as UseControllerProps<TFieldValues>["defaultValue"]}
        render={({ field }) => (
          (() => {
            const selectedUsers: User[] = multiple
              ? Array.isArray(field.value)
                ? field.value
                    .map((value: unknown) => {
                      const valueId = getUserId(value);
                      return users.find((user) => user.id === valueId);
                    })
                    .filter(Boolean)
                : []
              : [];
            const fieldValueId = getUserId(field.value);
            const fieldValue = isUserLike(field.value)
              ? (field.value as User)
              : null;
            const selectedUser: User | null =
              !multiple
                ? users.find((user) => user.id === fieldValueId) ??
                  fieldValue ??
                  null
                : null;

            return (
              <Autocomplete<User, boolean, false, false>
                {...autocompleteProps}
                size="small"
                multiple={multiple}
                options={users}
                groupBy={(user: User) => getRoleLabel(user)}
                getOptionLabel={(user: User) => user?.full_name ?? ""}
                isOptionEqualToValue={(option: User, value: User) =>
                  option.id === value.id
                }
                value={multiple ? selectedUsers : selectedUser}
                onChange={(_, newValue) => field.onChange(newValue)}
                loading={userList.isLoading}
                disabled={
                  disabled ?? (providedOptions ? false : userList.isLoading)
                }
                sx={sx}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
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
                renderTags={(selected: readonly User[], getTagProps) =>
                  selected.map((option, index) => (
                    <Chip
                      label={option.full_name}
                      avatar={
                        <UserAvatar
                          full_name={option.full_name}
                          role={getAvatarRole(option)}
                          src={option.avatar_img ?? undefined}
                          size={24}
                        />
                      }
                      {...getTagProps({ index })}
                    />
                  ))
                }
                renderInput={(params) => {
                  const { InputProps, ...rest } = params;
                  const startAdornment = !multiple && selectedUser ? (
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
