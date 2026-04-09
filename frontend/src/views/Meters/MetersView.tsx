import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Grid } from "@mui/material";

import { MeterSelection } from "@/views/Meters/MeterSelection/MeterSelection";
import { MeterDetailsFields } from "@/views/Meters/MeterDetailsFields";
import { MeterHistory } from "@/views/Meters/MeterHistory/MeterHistory";
import { BackgroundBox } from "@/components";

const tabToIndex = (tab: "list" | "map") => (tab === "list" ? 0 : 1);
const indexToTab = (i: number): "list" | "map" => (i === 1 ? "map" : "list");

export const MetersView = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/manage/meters" });

  const selectedMeter = search.meter_id;
  const meterAddMode = search.add;
  const currentTab = search.tab;
  const meterSearchQuery = search.q ?? "";
  const meterFilterButtons = search.filters;
  const meterSizeSort = search.m_sizeSort;

  // If a meter is selected, force add mode off (and reflect in URL)
  useEffect(() => {
    if (!selectedMeter) return;
    if (search.add === false) return;

    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        add: false,
      }),
      replace: true,
    });
  }, [selectedMeter, search.add, navigate]);

  const handleMeterSelection = (meterId?: number) => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        meter_id: meterId,
        activity_id: undefined,
        observation_id: undefined,
        // selecting a meter turns add off
        add: meterId ? false : prev.add,
      }),
    });
  };

  const handleMeterAddMode = (addMode: boolean) => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        add: addMode,
        // entering add mode clears meter selection + activity + observation
        meter_id: addMode ? undefined : prev.meter_id,
        activity_id: addMode ? undefined : prev.activity_id,
        observation_id: addMode ? undefined : prev.observation_id,
      }),
    });
  };

  const handleTabChange = (tabIndex: number) => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        tab: indexToTab(tabIndex),
      }),
    });
  };

  const handleSearchQueryChange = (query: string) => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        q: query.trim() ? query : undefined,
      }),
    });
  };

  const handleFilterButtonsChange = (
    filters: Array<"installed" | "stored" | "sold" | "scrapped" | "unknown">,
  ) => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        filters: filters.length ? filters : ["installed"],
      }),
    });
  };

  const handleMeterSizeSortChange = (sizeSort: "all" | "true" | "false") => {
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        m_sizeSort: sizeSort,
        m_page: 0,
      }),
    });
  };

  return (
    <BackgroundBox>
      <Grid
        container
        spacing={2}
        sx={{ minHeight: { xs: "100vh", lg: "60vh" } }}
      >
        <Grid item xs={12} lg={6}>
          <MeterSelection
            onMeterSelection={handleMeterSelection}
            setMeterAddMode={handleMeterAddMode}
            currentTabIndex={tabToIndex(currentTab)}
            onTabChange={handleTabChange}
            meterSearchQuery={meterSearchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            meterFilterButtons={meterFilterButtons}
            onFilterButtonsChange={handleFilterButtonsChange}
            meterSizeSort={meterSizeSort}
            onMeterSizeSortChange={handleMeterSizeSortChange}
          />
        </Grid>
        <Grid item xs={12} lg={6}>
          <MeterDetailsFields
            selectedMeterID={selectedMeter}
            meterAddMode={meterAddMode}
          />
        </Grid>
      </Grid>
      <Grid id="history_section" item xs={12} sx={{ pt: 2 }}>
        <MeterHistory selectedMeterID={selectedMeter} />
      </Grid>
    </BackgroundBox>
  );
};
