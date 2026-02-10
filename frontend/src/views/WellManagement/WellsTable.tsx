import { useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Tab,
  Tabs,
  Box,
  InputAdornment,
} from "@mui/material";
import { FormatListBulletedOutlined } from "@mui/icons-material";
import { Search } from "@mui/icons-material";
import { CustomCardHeader, TabPanel } from "@/components";

import WellSelectionTable from "./WellSelectionTable";
import WellSelectionMap from "./WellSelectionMap";

export const WellsTable = ({
  setSelectedWell,
  setWellAddMode,
}: {
  setSelectedWell: Function;
  setWellAddMode: Function;
}) => {
  const [wellSearchQuery, setWellSearchQuery] = useState<string>("");
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) =>
    setCurrentTabIndex(newTabIndex);

  return (
    <Card
      sx={{
        height: "100%",
        minHeight: "fit-content",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CustomCardHeader title="All Wells" icon={FormatListBulletedOutlined} />
      <CardContent>
        <Grid container justifyContent="space-between">
          <Grid item xs={6}>
            <Tabs value={currentTabIndex} onChange={handleTabChange}>
              <Tab label="Well List" />
              <Tab label="Well Map" />
            </Tabs>
          </Grid>
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <TextField
              sx={{ m: 0, pl: 2, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Wells..."
              variant="outlined"
              size="small"
              value={wellSearchQuery}
              onChange={(event: any) => setWellSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ height: "fit-content" }}>
          <TabPanel currentTabIndex={currentTabIndex} tabIndex={0}>
            <WellSelectionTable
              setSelectedWell={setSelectedWell}
              wellSearchQueryProp={wellSearchQuery}
              setWellAddMode={setWellAddMode}
            />
          </TabPanel>
          <TabPanel currentTabIndex={currentTabIndex} tabIndex={1}>
            <WellSelectionMap
              setSelectedWell={setSelectedWell}
              wellSearchQueryProp={wellSearchQuery}
            />
          </TabPanel>
        </Box>
      </CardContent>
    </Card>
  );
};
