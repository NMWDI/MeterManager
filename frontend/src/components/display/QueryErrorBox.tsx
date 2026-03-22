import { Alert, AlertTitle, Box, Button, SxProps, Theme } from "@mui/material";

type QueryErrorBoxProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  minHeight?: number | string;
  sx?: SxProps<Theme>;
};

export const QueryErrorBox = ({
  title = "Unable to Load Data",
  message,
  onRetry,
  minHeight,
  sx,
}: QueryErrorBoxProps) => {
  return (
    <Box
      sx={{
        width: "100%",
        minHeight,
        display: "flex",
        alignItems: "stretch",
        ...sx,
      }}
    >
      <Alert
        severity="error"
        sx={{ width: "100%", justifyContent: "center" }}
        action={
          onRetry ? (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
};
