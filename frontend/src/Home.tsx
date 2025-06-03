import { Box, Card, CardContent, Typography } from "@mui/material";
import pvacd_logo from "./img/pvacd_logo.png";
import meter_field from "./img/meter_field.jpg";
import meter_storage from "./img/meter_storage.jpg";
import HomeIcon from "@mui/icons-material/Home";
import { BackgroundBox } from "./components/BackgroundBox";
import { CustomCardHeader } from "./components/CustomCardHeader";

export const Home = () => {
  const versionHistory = [
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
        <CustomCardHeader title="Meter Manager Home" icon={HomeIcon} />
        <CardContent>
          <Box>
            <img src={pvacd_logo} />
            <Box>
              <Typography variant="body2">PVACD Meter Manager Info</Typography>
              <Typography variant="h4">Version History</Typography>
              <ul>
                {versionHistory.map((version) => (
                  <li key={version}>{version}</li>
                ))}
              </ul>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-around",
                  width: 600,
                }}
              >
                <img src={meter_field} width="200" />
                <img src={meter_storage} width="200" />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
