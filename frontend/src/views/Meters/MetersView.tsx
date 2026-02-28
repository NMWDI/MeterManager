import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Grid } from "@mui/material";

import { MeterSelection } from "./MeterSelection/MeterSelection";
import { MeterDetailsFields } from "./MeterDetailsFields";
import { MeterHistory } from "./MeterHistory/MeterHistory";

import { BackgroundBox } from "@/components";

// Main view for the Meters page
// URL state is used to pre-select a meter and history details
export const MetersView = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/manage/meters" });

  const [selectedMeter, setSelectedMeter] = useState<number | undefined>(
    search.meter_id,
  );
  const [meterAddMode, setMeterAddMode] = useState<boolean>(
    search.add ?? false,
  );
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(
    search.tab ?? 0,
  );
  const [meterSearchQuery, setMeterSearchQuery] = useState<string>(
    search.q ?? "",
  );
  const [meterFilterButtons, setMeterFilterButtons] = useState<string[]>(
    search.filters && search.filters.length > 0
      ? search.filters
      : ["installed"],
  );

  useEffect(() => {
    setSelectedMeter(search.meter_id);
    setMeterAddMode(search.add ?? false);
    setCurrentTabIndex(search.tab ?? 0);
    setMeterSearchQuery(search.q ?? "");
    setMeterFilterButtons(
      search.filters && search.filters.length > 0
        ? search.filters
        : ["installed"],
    );
  }, [search.add, search.filters, search.meter_id, search.q, search.tab]);

  //Always set the meterAddMode to false when a new meter is selected
  useEffect(() => {
    if (selectedMeter) {
      setMeterAddMode(false);
    }
  }, [selectedMeter]);

  useEffect(() => {
    if (selectedMeter && search.add) {
      navigate({
        to: "/manage/meters",
        search: (prev) => ({
          meter_id: prev.meter_id ?? undefined,
          tab: prev.tab ?? undefined,
          q: prev.q ?? undefined,
          filters: prev.filters ?? undefined,
          activity_id: prev.activity_id ?? undefined,
          add: undefined,
        }),
        replace: true,
      });
    }
  }, [selectedMeter, search.add, navigate]);

  const handleMeterSelection = (meterId?: number) => {
    setSelectedMeter(meterId);
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        tab: prev.tab ?? undefined,
        q: prev.q ?? undefined,
        filters: prev.filters ?? undefined,
        meter_id: meterId,
        activity_id: undefined,
        add: meterId ? false : prev.add,
      }),
    });
  };

  const handleMeterAddMode = (addMode: boolean) => {
    setMeterAddMode(addMode);
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        tab: prev.tab ?? undefined,
        q: prev.q ?? undefined,
        filters: prev.filters ?? undefined,
        add: addMode ? true : undefined,
        meter_id: addMode ? undefined : prev.meter_id,
        activity_id: addMode ? undefined : prev.activity_id,
      }),
    });
  };

  const handleTabChange = (tabIndex: number) => {
    setCurrentTabIndex(tabIndex);
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        q: prev.q ?? undefined,
        filters: prev.filters ?? undefined,
        add: prev.add ? true : undefined,
        meter_id: prev.meter_id ?? undefined,
        activity_id: prev.activity_id ?? undefined,
        tab: tabIndex ? tabIndex : undefined,
      }),
    });
  };

  const handleSearchQueryChange = (query: string) => {
    setMeterSearchQuery(query);
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        tab: prev.tab ?? undefined,
        filters: prev.filters ?? undefined,
        add: prev.add ? true : undefined,
        meter_id: prev.meter_id ?? undefined,
        activity_id: prev.activity_id ?? undefined,
        q: query ? query : undefined,
      }),
    });
  };

  const handleFilterButtonsChange = (filters: string[]) => {
    setMeterFilterButtons(filters);
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        tab: prev.tab ?? undefined,
        add: prev.add ? true : undefined,
        meter_id: prev.meter_id ?? undefined,
        activity_id: prev.activity_id ?? undefined,
        q: prev.q ?? undefined,
        filters: filters.length ? filters : undefined,
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
            currentTabIndex={currentTabIndex}
            onTabChange={handleTabChange}
            meterSearchQuery={meterSearchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            meterFilterButtons={meterFilterButtons}
            onFilterButtonsChange={handleFilterButtonsChange}
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
