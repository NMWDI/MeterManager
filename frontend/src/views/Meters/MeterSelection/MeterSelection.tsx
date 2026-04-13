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
import { Search, SpeedOutlined } from "@mui/icons-material";
import { MeterStatusNames } from "@/enums";
import {
  CustomCardHeader,
  ManageBreadcrumbTitle,
  TabPanel,
  TristateToggle,
} from "@/components";
import { useMemo } from "react";
import type { TriString } from "@/components";

type MeterFilterKey = "installed" | "stored" | "sold" | "scrapped" | "unknown";

export const MeterSelection = ({
  onMeterSelection,
  setMeterAddMode,
  currentTabIndex,
  onTabChange,
  meterSearchQuery,
  onSearchQueryChange,
  meterFilterButtons,
  onFilterButtonsChange,
  meterSizeSort,
  onMeterSizeSortChange,
}: {
  onMeterSelection: (meterId?: number) => void;
  setMeterAddMode: (addMode: boolean) => void;
  currentTabIndex: number;
  onTabChange: (index: number) => void;
  meterSearchQuery: string;
  onSearchQueryChange: (query: string) => void;
  meterFilterButtons: MeterFilterKey[];
  onFilterButtonsChange: (filters: MeterFilterKey[]) => void;
  meterSizeSort: TriString;
  onMeterSizeSortChange: (value: TriString) => void;
}) => {
  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) =>
    onTabChange(newTabIndex);

  const handleFilterSelect = (
    _: React.MouseEvent<HTMLElement>,
    newFilters: MeterFilterKey[],
  ) => {
    onFilterButtonsChange(newFilters.length ? newFilters : ["installed"]);
  };

  const meterFilters: MeterStatusNames[] = useMemo(() => {
    const out: MeterStatusNames[] = [];
    if (meterFilterButtons.includes("installed"))
      out.push(MeterStatusNames.Installed);
    if (meterFilterButtons.includes("stored"))
      out.push(MeterStatusNames.Warehouse);
    if (meterFilterButtons.includes("sold")) out.push(MeterStatusNames.Sold);
    if (meterFilterButtons.includes("scrapped"))
      out.push(MeterStatusNames.Scrapped, MeterStatusNames.Returned);
    if (meterFilterButtons.includes("unknown"))
      out.push(MeterStatusNames.Unknown);
    return out;
  }, [meterFilterButtons]);

  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader
        title={<ManageBreadcrumbTitle current="Meters" />}
        icon={SpeedOutlined}
      />
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
          <Grid
            container
            item
            sx={{ mt: 1 }}
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Grid item>
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
            <Grid item>
              <TristateToggle
                label="Size Sort"
                value={meterSizeSort}
                onToggle={onMeterSizeSortChange}
                stateLabels={{
                  all: "Size Sort: None",
                  true: "Size Sort: Ascending",
                  false: "Size Sort: Descending",
                }}
              />
            </Grid>
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
