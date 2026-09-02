import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import RawAuthProvider from "react-auth-kit/AuthProvider";
import rawUseSignIn from "react-auth-kit/hooks/useSignIn";
import rawUseSignOut from "react-auth-kit/hooks/useSignOut";
import createAuthStore from "react-auth-kit/store/createAuthStore";
import type { User, UserRole } from "@/interfaces";

type AuthType = "localstorage" | "cookie";

type LegacyAuthProviderProps = {
  authType: AuthType;
  authName?: string;
  cookieDomain?: string;
  cookieSecure?: boolean;
  children: ReactNode;
};

type LegacySignInParams<T> = {
  token: string;
  expiresIn?: number;
  tokenType?: string;
  authState?: T;
};

type AuthKitUser = Omit<User, "avatar_img" | "user_role"> & {
  avatar_img?: string;
  user_role: UserRole;
};

type AuthKitState<T> = {
  auth: {
    token: string;
    type: string;
    expiresAt: Date;
  } | null;
  refresh: unknown | null;
  userState: T | null;
  isUsingRefreshToken: boolean;
  isSignIn: boolean;
};

type CompatAuthContextValue = {
  authState: AuthKitState<User>;
};

type SubscribableTokenStore = {
  value: AuthKitState<User>;
  authSubject?: {
    subscribe: (next: (value: AuthKitState<User>) => void) => {
      unsubscribe: () => void;
    };
  };
};

const CompatAuthContext = createContext<CompatAuthContextValue | null>(null);

const getCompatAuthName = (authName?: string) =>
  authName === "_auth" ? "authkit" : authName;

function CompatAuthStateProvider({
  store,
  children,
}: {
  store: SubscribableTokenStore;
  children: ReactNode;
}) {
  const [authState, setAuthState] = useState(store.value);

  useEffect(() => {
    setAuthState(store.value);

    const subscription = store.authSubject?.subscribe(setAuthState);
    return () => subscription?.unsubscribe();
  }, [store]);

  const contextValue = useMemo(() => ({ authState }), [authState]);

  return (
    <CompatAuthContext.Provider value={contextValue}>
      {children}
    </CompatAuthContext.Provider>
  );
}

function useCompatAuthState() {
  const context = useContext(CompatAuthContext);
  if (!context) {
    throw new Error("Auth Provider is missing.");
  }

  return context.authState;
}

export function AuthProvider({
  authType,
  authName,
  cookieDomain,
  cookieSecure,
  children,
}: LegacyAuthProviderProps) {
  const store = useMemo(
    () =>
      createAuthStore<User>(authType, {
        authName: getCompatAuthName(authName),
        cookieDomain,
        cookieSecure,
      }),
    [authName, authType, cookieDomain, cookieSecure],
  );

  return (
    <RawAuthProvider store={store}>
      <CompatAuthStateProvider
        store={store.tokenStore as SubscribableTokenStore}
      >
        {children}
      </CompatAuthStateProvider>
    </RawAuthProvider>
  );
}

export function useAuthHeader() {
  const authState = useCompatAuthState();

  return useCallback(() => {
    if (!authState.auth || new Date(authState.auth.expiresAt) <= new Date()) {
      return "";
    }

    return `${authState.auth.type} ${authState.auth.token}`;
  }, [authState.auth]);
}

export function useAuthUser<T = AuthKitUser>() {
  const authState = useCompatAuthState();

  return useCallback(() => {
    if (!authState.auth || new Date(authState.auth.expiresAt) <= new Date()) {
      return null;
    }

    return (authState.userState ?? null) as T | null;
  }, [authState.auth, authState.userState]);
}

export function useIsAuthenticated() {
  const authState = useCompatAuthState();

  return useCallback(
    () => !!authState.auth && new Date(authState.auth.expiresAt) > new Date(),
    [authState.auth],
  );
}

export function useSignIn<T = User>() {
  const signIn = rawUseSignIn<T>();

  return useCallback(
    ({ token, tokenType, authState }: LegacySignInParams<T>) =>
      signIn({
        auth: {
          token,
          type: tokenType,
        },
        userState: authState,
      }),
    [signIn],
  );
}

export function useSignOut(navigateTo?: string) {
  const signOut = rawUseSignOut(navigateTo);

  return useCallback(() => {
    localStorage.removeItem("_auth");
    localStorage.removeItem("loggedIn");
    return signOut();
  }, [signOut]);
}
