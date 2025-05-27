import { useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Tab,
  Tabs,
  Box,
} from "@mui/material";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TabPanel from "../../components/TabPanel";
import WellSelectionTable from "./WellSelectionTable";
import WellSelectionMap from "./WellSelectionMap";
import { CustomCardHeader } from "../../components/CustomCardHeader";

interface WellsTableProps {
  setSelectedWell: Function;
  setWellAddMode: Function;
}

export const WellsTable = ({
  setSelectedWell,
  setWellAddMode,
}: WellsTableProps) => {
  const [wellSearchQuery, setWellSearchQuery] = useState<string>("");

  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) =>
    setCurrentTabIndex(newTabIndex);

  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader
        title="All Wells"
        icon={FormatListBulletedOutlinedIcon}
      />
      <CardContent sx={{ height: "100%" }}>
        <Grid container>
          <Grid item xs={9}>
            <Tabs value={currentTabIndex} onChange={handleTabChange}>
              <Tab label="Well List" />
              <Tab label="Well Map" />
            </Tabs>
          </Grid>
          <Grid item xs={3}>
            <TextField
              label={
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <SearchIcon sx={{ fontSize: "1.2rem" }} />{" "}
                  <span style={{ marginTop: 1 }}>&nbsp;Search Wells</span>
                </div>
              }
              variant="outlined"
              size="small"
              value={wellSearchQuery}
              onChange={(event: any) => setWellSearchQuery(event.target.value)}
              sx={{ marginBottom: "10px" }}
            />
          </Grid>
        </Grid>
        <Box sx={{ height: "89%" }}>
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
