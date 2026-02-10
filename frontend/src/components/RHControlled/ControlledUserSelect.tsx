import { useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { User } from "@/interfaces";
import { useGetUserList } from "@/service/ApiServiceNew";

import { ControlledSelect } from "./ControlledSelect";

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

    return (
      <ControlledSelect
        control={control}
        name={name}
        options={userList.data ?? []}
        getOptionLabel={(user: User) => user.full_name}
        label="User"
        disabled={userList.isLoading}
        {...childProps}
        value={userList.isLoading ? "Loading..." : childProps.value}
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
