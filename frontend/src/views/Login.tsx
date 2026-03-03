import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser, useIsAuthenticated, useSignIn } from "react-auth-kit";
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  Grid,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Login as LoginIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { SecurityScope } from "@/interfaces";
import { API_URL } from "@/config";
import { CustomCardHeader } from "@/components";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signIn = useSignIn();
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = new FormData();
    body.append("username", username);
    body.append("password", password);

    fetch(`${API_URL}/token`, { method: "POST", body })
      .then(handleLogin)
      .catch((_) => {
        setError(
          "Unable to connect to the server. Please check your internet connection and try again. If the issue persists, contact support.",
        );
      });
  };

  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: authUser()?.redirect_page ?? "/" });
    }
  }, [isAuthenticated, navigate]);

  function handleLogin(res: Response) {
    if (res.status === 200) {
      res.json().then((data) => {
        if (
          !data?.user?.user_role?.security_scopes
            ?.map((scope: SecurityScope) => scope.scope_string)
            .find((scope_string: string) => scope_string == "read")
        ) {
          enqueueSnackbar(
            "Your role does not have access to the site UI. Please try accessing data via our API.",
            { variant: "error" },
          );
          return;
        }
        if (
          signIn({
            token: data.access_token,
            expiresIn: 300,
            tokenType: "bearer",
            authState: data.user,
          })
        ) {
          localStorage.setItem("_auth", data.access_token);
          localStorage.setItem("loggedIn", "true");
          navigate({ to: data.user.redirect_page ?? "/" });
        } else {
          setError("Invalid username or password. Please try again.");
        }
      });
    } else {
      setError("Login failed. Please check your credentials and try again.");
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        m: 2,
        mt: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Card sx={{ width: "25%", minWidth: 300 }}>
        <CustomCardHeader title="Login" icon={LoginIcon} />
        <CardContent
          sx={{
            pt: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            component="form"
            autoComplete="off"
            onSubmit={handleSubmit}
            sx={{ width: "100%" }}
          >
            <Stack
              spacing={2}
              sx={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}
            >
              <TextField
                value={username}
                required
                fullWidth
                label="Username"
                name="username"
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                value={password}
                required
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((show) => !show)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            <Grid container justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                sx={{
                  backgroundColor: "darkblue",
                  color: "white",
                  fontWeight: "bold",
                  "&:hover": {
                    backgroundColor: "#00008b",
                  },
                }}
              >
                Login
              </Button>
            </Grid>
          </Box>
        </CardContent>
      </Card>
      {error?.trim() && (
        <Alert sx={{ alignItems: "center", mt: 2 }} severity="error">
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Login;
