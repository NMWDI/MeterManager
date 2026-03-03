import { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { ContentCopy, Home, Refresh, Warning } from "@mui/icons-material";
import { Link } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { BackgroundBox, CustomCardHeader } from "@/components";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return "An unknown routing error occurred.";
    }
  }

  return "An unknown routing error occurred.";
};

const getExactUrl = (): string => {
  if (typeof window === "undefined") {
    return "Unavailable during server rendering";
  }

  return window.location.href;
};

type RouteErrorViewProps = {
  error: unknown;
  onRetry?: () => void;
};

export const RouteErrorView = ({ error, onRetry }: RouteErrorViewProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const errorMessage = useMemo(() => getErrorMessage(error), [error]);
  const exactUrl = useMemo(() => getExactUrl(), []);

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      enqueueSnackbar(`${label} copied.`, { variant: "success" });
    } catch {
      enqueueSnackbar(`Unable to copy ${label.toLowerCase()}.`, {
        variant: "error",
      });
    }
  };

  return (
    <BackgroundBox sx={{ pt: 10 }}>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Something Went Wrong" icon={Warning} />
        <CardContent>
          <Stack spacing={2.5}>
            <Box pt={2}>
              <Stack
                direction={{ xs: "column" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{ mb: 1.5 }}
              >
                <Typography variant="h4" py={2}>
                  We encountered an unexpected error while loading this page.
                </Typography>

                <Typography variant="body1">
                  To help us resolve this as quickly as possible, please copy
                  the <strong>Error Message</strong> and the{" "}
                  <strong>Exact URL</strong> below and include them when
                  reporting this issue to support.
                </Typography>
              </Stack>
            </Box>

            <Box py={2}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Error Message
              </Typography>
              <Box
                sx={{
                  borderRadius: 2,
                  backgroundColor: "#f5f7fa",
                  border: "1px solid",
                  borderColor: "divider",
                  px: 2,
                  py: 1.5,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {errorMessage}
              </Box>
              <Button
                sx={{ mt: 1.25 }}
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={() => copyValue("Error message", errorMessage)}
              >
                Copy Error Message
              </Button>
            </Box>

            <Box py={2}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Exact URL
              </Typography>
              <Box
                sx={{
                  borderRadius: 2,
                  backgroundColor: "#f5f7fa",
                  border: "1px solid",
                  borderColor: "divider",
                  px: 2,
                  py: 1.5,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {exactUrl}
              </Box>
              <Button
                sx={{ mt: 1.25 }}
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={() => copyValue("Exact URL", exactUrl)}
              >
                Copy URL
              </Button>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              pt={2}
              spacing={1.25}
              justifyContent="space-between"
            >
              <Button
                component={Link}
                to="/"
                variant="contained"
                startIcon={<Home />}
              >
                Back to Home
              </Button>
              {onRetry && (
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={onRetry}
                >
                  Try Again
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
