import { MeterSelectionTable } from "./MeterSelectionTable";
import MeterSelectionMap from "./MeterSelectionMap";
import {
  Tabs,
  Tab,
  TextField,
  Grid,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from "@mui/material";
import { FormatListBulletedOutlined, Search } from "@mui/icons-material";
import { MeterStatusNames } from "@/enums";
import { CustomCardHeader, TabPanel } from "@/components";

export const MeterSelection = ({
  onMeterSelection,
  setMeterAddMode,
  currentTabIndex,
  onTabChange,
  meterSearchQuery,
  onSearchQueryChange,
  meterFilterButtons,
  onFilterButtonsChange,
}: {
  onMeterSelection: Function;
  setMeterAddMode: Function;
  currentTabIndex: number;
  onTabChange: (index: number) => void;
  meterSearchQuery: string;
  onSearchQueryChange: (query: string) => void;
  meterFilterButtons: string[];
  onFilterButtonsChange: (filters: string[]) => void;
}) => {
  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) =>
    onTabChange(newTabIndex);

  const handleFilterSelect = (
    _: React.MouseEvent<HTMLElement>,
    newFilters: string[],
  ) => {
    if (newFilters.length === 0) {
      newFilters.push("installed");
    }

    onFilterButtonsChange(newFilters);
  };

  const meterFilters: MeterStatusNames[] = (() => {
    // Update the meterFilters based on the selected filter buttons
    let updatedMeterFilters: MeterStatusNames[] = [];
    if (meterFilterButtons.includes("installed")) {
      updatedMeterFilters.push(MeterStatusNames.Installed);
    }
    if (meterFilterButtons.includes("stored")) {
      updatedMeterFilters.push(MeterStatusNames.Warehouse);
    }
    if (meterFilterButtons.includes("sold")) {
      updatedMeterFilters.push(MeterStatusNames.Sold);
    }
    if (meterFilterButtons.includes("scrapped")) {
      updatedMeterFilters.push(MeterStatusNames.Scrapped);
      updatedMeterFilters.push(MeterStatusNames.Returned);
    }
    if (meterFilterButtons.includes("unknown")) {
      updatedMeterFilters.push(MeterStatusNames.Unknown);
    }
    return updatedMeterFilters;
  })();

  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader title="All Meters" icon={FormatListBulletedOutlined} />
      <CardContent sx={{ height: "100%" }}>
        <Grid container justifyContent="space-between">
          <Grid item xs={6}>
            <Tabs
              value={currentTabIndex}
              onChange={handleTabChange}
              aria-label="Switch between Meter List & Map"
              sx={{
                width: "100%",
                maxWidth: "100rem",
              }}
            >
              <Tab label="Meter List" />
              <Tab label="Meter Map" />
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
              placeholder="Search Meter..."
              variant="outlined"
              size="small"
              value={meterSearchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
              }}
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
          <Grid container sx={{ mt: 1, height: 550 }}>
            <Grid item xs={12} sx={{ height: "100%" }}>
              <MeterSelectionMap
                onMeterSelection={onMeterSelection}
                meterSearch={meterSearchQuery}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </CardContent>
    </Card>
  );
};
