import { useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Autocomplete, Box, Stack, TextField } from "@mui/material";
import { Controller } from "react-hook-form";
import { User } from "@/interfaces";
import { useGetUserList } from "@/service";
import { UserAvatar } from "@/components/UserAvatar";
import {
  getRoleLabel,
  sortUsersByRoleThenName,
} from "@/utils/UserRoleGrouping";

const getAvatarRole = (user: User | null | undefined) =>
  user ? getRoleLabel(user) : undefined;

export const ControlledUserSelect = ({
  name,
  control,
  hideAndSelectCurrentUser = false,
  setValue = null,
  ...childProps
}: any) => {
  const [isCurrentUserSet, setIsCurrentUserSet] = useState<boolean>(false);

  if (!hideAndSelectCurrentUser) {
    const userList = useGetUserList();
    const users = useMemo(
      () => sortUsersByRoleThenName(userList.data ?? []),
      [userList.data],
    );
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
            const selectedUser =
              users.find((user) => user.id === field.value?.id) ??
              field.value ??
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

                  return (
                    <TextField
                      {...rest}
                      label={label}
                      error={Boolean(error)}
                      helperText={error ?? helperText}
                      InputProps={{
                        ...InputProps,
                        startAdornment: (
                          <>
                            {selectedUser ? (
                              <UserAvatar
                                full_name={selectedUser.full_name}
                                role={getAvatarRole(selectedUser)}
                                src={selectedUser.avatar_img ?? undefined}
                                size={20}
                                sx={{ mr: 0.75 }}
                              />
                            ) : null}
                            {InputProps.startAdornment}
                          </>
                        ),
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
    if (!isCurrentUserSet) {
      const currentUser = useAuthUser();
      setValue(name, currentUser());
      setIsCurrentUserSet(true);
    }
    return null;
  }
};
