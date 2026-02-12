import type { SecurityScope } from "./SecurityScope";

export interface UserRole {
  id: number;
  name: string;
  security_scopes: SecurityScope[];
}
