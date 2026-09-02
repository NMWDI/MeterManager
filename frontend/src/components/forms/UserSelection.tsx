import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useAuthUser } from "@/utils/AuthKitCompat";
import { useGetUserList } from "@/service";
import { User } from "@/interfaces";

export default function UserSelection({
  selectedUser,
  onUserChange,
  hideAndSelectCurrentUser,
  error,
}: {
  selectedUser?: User;
  onUserChange: Function;
  hideAndSelectCurrentUser: boolean;
  error?: boolean;
}) {
  if (!hideAndSelectCurrentUser) {
    const userList = useGetUserList();
    const handleChangeUser = (userID: number) =>
      onUserChange(userList.data?.find((user: User) => user.id == userID));

    return (
      <FormControl
        size="small"
        fullWidth
        required
        disabled={userList.isLoading}
        error={error}
      >
        <InputLabel>User</InputLabel>
        <Select
          value={userList.isLoading ? "loading" : (selectedUser?.id ?? "")}
          onChange={(event: any) => handleChangeUser(event.target.value)}
          label="User"
        >
          {userList.data?.map((user: any) => (
            <MenuItem key={user.id} value={user.id}>
              {user.full_name}
            </MenuItem>
          ))}
          {userList.isLoading && (
            <MenuItem value={"loading"} hidden>
              Loading...
            </MenuItem>
          )}
        </Select>
      </FormControl>
    );
  } else {
    const currentUser = useAuthUser();
    onUserChange(currentUser);
    return null;
  }
}
