import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { enqueueSnackbar } from "notistack";

type ErrorMessageContextValue = {
  setErrorMessage: (msg?: string) => void;
};

const ErrorMessageContext = createContext<ErrorMessageContextValue | null>(null);

export const ErrorMessageProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Showing messages between navigation (eg: accessing forbidden page, accessing while not logged in)
  // results in duplicated snackbars, this is a workaround.
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (errorMessage) {
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  }, [errorMessage]);

  return (
    <ErrorMessageContext.Provider value={{ setErrorMessage }}>
      {children}
    </ErrorMessageContext.Provider>
  );
};

export const useErrorMessage = () => {
  const context = useContext(ErrorMessageContext);
  if (!context) {
    throw new Error(
      "useErrorMessage must be used within an ErrorMessageProvider",
    );
  }
  return context;
};
