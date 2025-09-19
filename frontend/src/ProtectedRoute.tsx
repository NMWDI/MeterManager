import { Navigate } from "react-router-dom";
import { useAuthUser, useIsAuthenticated } from "react-auth-kit";
import { SecurityScope } from "./interfaces";

export const ProtectedRoute = ({
  children,
  requiredScopes,
  setErrorMessage,
}: {
  children: JSX.Element;
  requiredScopes?: string[];
  setErrorMessage?: (msg: string) => void;
}) => {
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();

  // Case 1: Not logged in
  if (!isAuthenticated()) {
    if (setErrorMessage) setErrorMessage("You must login to view this page.");
    return <Navigate to="/login" replace />;
  }

  // Case 2: Logged in but no scopes
  const userScopes: string[] =
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string
    ) ?? [];

  if (userScopes.length === 0) {
    if (setErrorMessage)
      setErrorMessage("Your account does not have any permissions.");
    return <Navigate to="/" replace />;
  }

  // Case 3: Missing required scopes
  if (requiredScopes && !requiredScopes.every((s) => userScopes.includes(s))) {
    if (setErrorMessage)
      setErrorMessage("You do not have sufficient permissions.");
    return <Navigate to="/" replace />;
  }

  return children;
};
