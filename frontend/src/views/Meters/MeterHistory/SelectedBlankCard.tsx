import { Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { CustomCardHeader } from "@/components";
import { ArrowBack, CloudSync, NewReleases } from "@mui/icons-material";

export const SelectedBlankCard = ({
  isLoading = false,
}: {
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CustomCardHeader
        title={isLoading ? "Loading details..." : "Action Required!"}
        icon={isLoading ? CloudSync : NewReleases}
      />
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
          pt: 3,
          pb: 6,
          color: "text.secondary",
          minHeight: 200,
        }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={32} />
            <Typography variant="body1">Loading details…</Typography>
          </>
        ) : (
          <>
            <ArrowBack sx={{ fontSize: 28 }} />
            <Typography variant="h6" align="center">
              Select an activity or observation to view its details.
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};
