import { Card, CardContent, Typography } from "@mui/material";
import { CustomCardHeader } from "@/components";
import { ArrowBack, NewReleases } from "@mui/icons-material";

export const SelectedBlankCard = () => {
  return (
    <Card>
      <CustomCardHeader title="Selected Details" icon={NewReleases} />
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          pt: 3,
          pb: 6,
          color: "text.secondary",
        }}
      >
        <ArrowBack sx={{ fontSize: 28 }} />
        <Typography variant="h5">
          Select an activity or observation to view its details.
        </Typography>
      </CardContent>
    </Card>
  );
};
