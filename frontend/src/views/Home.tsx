import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import pvacd_logo from "@/img/pvacd_logo.png";
import meter_field from "@/img/meter_field.jpg";
import meter_storage from "@/img/meter_storage.jpg";
import HomeIcon from "@mui/icons-material/Home";
import { CustomCardHeader, BackgroundBox } from "@/components";

export const Home = () => {
  const versionHistory = [
    "V0.2.0 - Parts-used report functional with PDF download",
    "V0.1.52 - Deploy chlorides for admin testing",
    "V0.1.51 - Improved monitoring well page",
    "V0.1.50 - Fixed wells map bug and update register if part used",
    "V0.1.49 - Added outside recorder wells to monitoring page",
    "V0.1.48 - Changed well owner to be meter water users",
    "V0.1.47 - Add TRSS grids to meter map and fixed meter register save bug",
    "V0.1.46 - Change how data is displayed in Wells table",
    "V0.1.45 - Color code meter markers on map by last PM",
    "V0.1.44 - Fix bug in continuous monitoring well data and added data to OSE endpoint",
    'V0.1.43 - Fix navigation from work orders to activity, add OSE endpoint for "data issues"',
    "V0.1.42 - Fix pagination, add 'uninstall and hold'",
    "V0.1.41 - Add UI for water source on wells and some other minor changes",
  ];

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Home" icon={HomeIcon} />
        <CardContent>
          <Grid
            container
            pl={3}
            pt={3}
            pb={1}
            pr={1}
            spacing={3}
            alignItems="flex-start"
          >
            <Grid item xs={12} md={6}>
              <CardMedia
                component="img"
                loading="lazy"
                image={pvacd_logo}
                alt="PVACD Logo"
                sx={{
                  maxWidth: 200,
                  width: "100%",
                  height: "auto",
                }}
              />
              <Stack spacing={1} alignItems="flex-start" textAlign="left">
                <Typography variant="body2">
                  PVACD Meter Manager Info
                </Typography>
                <Typography variant="h4">Version History</Typography>
                <List dense>
                  {versionHistory.map((version) => (
                    <ListItem key={version} disablePadding>
                      <ListItemText primary={version} />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack
                direction={{ xs: "column", xl: "row" }}
                spacing={2}
                justifyContent="center"
                alignItems={{ xs: "center", xl: "flex-start" }}
                sx={{ width: "100%" }}
              >
                <CardMedia
                  component="img"
                  loading="lazy"
                  image={meter_field}
                  alt="Field Meter"
                  sx={{
                    maxWidth: 300,
                    width: "100%",
                    height: "auto",
                  }}
                />
                <CardMedia
                  component="img"
                  loading="lazy"
                  image={meter_storage}
                  alt="Storage Meter"
                  sx={{
                    maxWidth: 300,
                    width: "100%",
                    height: "auto",
                  }}
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
