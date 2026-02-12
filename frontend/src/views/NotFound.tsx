import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { Home, DoNotTouch } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { BackgroundBox, CustomCardHeader } from "@/components";

export const NotFound = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Not Found" icon={DoNotTouch} />
        <CardContent sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Sorry, the page you are looking for does not exist or may have been
            moved.
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              component={Link}
              to="/"
              variant="contained"
              startIcon={<Home />}
            >
              Back to Home
            </Button>
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
