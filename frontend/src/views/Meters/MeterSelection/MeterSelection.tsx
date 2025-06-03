import { useState } from "react";
import { MeterSelectionTable } from "./MeterSelectionTable";
import MeterSelectionMap from "./MeterSelectionMap";
import TabPanel from "../../../components/TabPanel";
import {
  Tabs,
  Tab,
  TextField,
  Grid,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import { MeterStatusNames } from "../../../enums";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

export const MeterSelection = ({
  onMeterSelection,
  setMeterAddMode,
}: {
  onMeterSelection: Function;
  setMeterAddMode: Function;
}) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [meterSearchQuery, setMeterSearchQuery] = useState<string>("");
  const [meterFilterButtons, setMeterFilterButtons] = useState<string[]>([
    "installed",
  ]);
  const [meterFilters, setMeterFilters] = useState<MeterStatusNames[]>([
    MeterStatusNames.Installed,
  ]);

  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) =>
    setCurrentTabIndex(newTabIndex);

  const handleFilterSelect = (
    _: React.MouseEvent<HTMLElement>,
    newFilters: string[],
  ) => {
    if (newFilters.length === 0) {
      newFilters.push("installed");
    }

    setMeterFilterButtons(newFilters);

    //Update the meterFilters based on the selected filter buttons
    let updatedMeterFilters: MeterStatusNames[] = [];
    if (newFilters.includes("installed")) {
      updatedMeterFilters.push(MeterStatusNames.Installed);
    }
    if (newFilters.includes("stored")) {
      updatedMeterFilters.push(MeterStatusNames.Warehouse);
    }
    if (newFilters.includes("sold")) {
      updatedMeterFilters.push(MeterStatusNames.Sold);
    }
    if (newFilters.includes("scrapped")) {
      updatedMeterFilters.push(MeterStatusNames.Scrapped);
      updatedMeterFilters.push(MeterStatusNames.Returned);
    }
    if (newFilters.includes("unknown")) {
      updatedMeterFilters.push(MeterStatusNames.Unknown);
    }
    setMeterFilters(updatedMeterFilters);
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader
        title="All Meters"
        icon={FormatListBulletedOutlinedIcon}
      />
      <CardContent sx={{ height: "100%" }}>
        <Grid container justifyContent="space-between">
          <Grid item xs={4}>
            <Tabs value={currentTabIndex} onChange={handleTabChange}>
              <Tab label="Meter List" />
              <Tab label="Meter Map" />
            </Tabs>
          </Grid>
          <Grid item xs={3}>
            <TextField
              sx={{ mt: 1 }}
              label="Search Meter"
              variant="outlined"
              size="small"
              value={meterSearchQuery}
              onChange={(e) => {
                setMeterSearchQuery(e.target.value);
              }}
            />
          </Grid>
        </Grid>
        <TabPanel currentTabIndex={currentTabIndex} tabIndex={0}>
          <Grid item sx={{ mt: 1 }}>
            <ToggleButtonGroup
              value={meterFilterButtons}
              exclusive={false}
              onChange={handleFilterSelect}
              size="small"
              aria-label="button group"
            >
              <ToggleButton value="installed" aria-label="Installed">
                Installed
              </ToggleButton>
              <ToggleButton value="stored" aria-label="Stored">
                Stored
              </ToggleButton>
              <ToggleButton value="sold" aria-label="Sold">
                Sold
              </ToggleButton>
              <ToggleButton value="scrapped" aria-label="Scrapped">
                Scrapped
              </ToggleButton>
              <ToggleButton value="unknown" aria-label="Unknown">
                Unknown
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <MeterSelectionTable
            onMeterSelection={onMeterSelection}
            meterSearchQuery={meterSearchQuery}
            meterStatusFilter={meterFilters}
            setMeterAddMode={setMeterAddMode}
          />
        </TabPanel>

        <TabPanel currentTabIndex={currentTabIndex} tabIndex={1}>
          <Grid container sx={{ mt: 1, height: 650 }}>
            <MeterSelectionMap
              onMeterSelection={onMeterSelection}
              meterSearch={meterSearchQuery}
            />
          </Grid>
        </TabPanel>
      </CardContent>
    </Card>
  );
};
