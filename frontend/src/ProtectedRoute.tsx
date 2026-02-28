import { Navigate } from "@tanstack/react-router";
import { useAuthUser, useIsAuthenticated } from "react-auth-kit";
import { SecurityScope } from "./interfaces";
import { useErrorMessage } from "./contexts/ErrorMessageContext";

export const ProtectedRoute = ({
  children,
  requiredScopes,
}: {
  children: JSX.Element;
  requiredScopes?: string[];
}) => {
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();
  const { setErrorMessage } = useErrorMessage();

  // Case 1: Not logged in
  if (!isAuthenticated()) {
    setErrorMessage("You must login to view this page.");
    return <Navigate to="/login" replace />;
  }

  // Case 2: Logged in but no scopes
  const userScopes: string[] =
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string
    ) ?? [];

  if (userScopes.length === 0) {
    setErrorMessage("Your account does not have any permissions.");
    return <Navigate to="/" replace />;
  }

  // Case 3: Missing required scopes
  if (requiredScopes && !requiredScopes.every((s) => userScopes.includes(s))) {
    setErrorMessage("You do not have sufficient permissions.");
    return <Navigate to="/" replace />;
  }

  return children;
};
