import { ROLE_IDS } from "@/config";
import { User } from "@/interfaces";

export type RoleLabel = "Admin" | "Technician" | "OSE" | "Unknown";

export const getRoleLabel = (user: User): RoleLabel => {
  switch (user.user_role_id) {
    case ROLE_IDS.ADMIN:
      return "Admin";
    case ROLE_IDS.TECHNICIAN:
      return "Technician";
    case ROLE_IDS.OSE:
      return "OSE";
    default:
      return "Unknown";
  }
};

export const roleOrder: Record<RoleLabel, number> = {
  Admin: 2,
  Technician: 1,
  OSE: 3,
  Unknown: 99,
};

export const sortUsersByRoleThenName = (users: User[]): User[] => {
  return [...users].sort((a, b) => {
    const roleCompare = roleOrder[getRoleLabel(a)] - roleOrder[getRoleLabel(b)];
    if (roleCompare !== 0) return roleCompare;

    return (a.full_name ?? "").localeCompare(b.full_name ?? "");
  });
};
