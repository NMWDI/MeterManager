import { Grid } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { BackgroundBox } from "@/components";
import { useGetMeterTypeList } from "@/service";
import { Route } from "@/routes/manage/parts/index";

import { PartsTable } from "./PartsTable";
import { MeterTypeDetailsCard } from "./MeterTypeDetailsCard";
import { PartDetailsCard } from "./PartDetailsCard";
import { MeterTypesTable } from "./MeterTypesTable";

export const PartsView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const meterTypes = useGetMeterTypeList();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/parts",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const selectedMeterType = meterTypes.data?.find(
    (meterType) => meterType.id === search.meter_type_id,
  );

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <PartsTable
            onSelectPart={(id: number) =>
              setSearch((prev) => ({
                ...prev,
                part_id: id,
                part_add: false,
              }))
            }
            onCreatePart={() =>
              setSearch((prev) => ({
                ...prev,
                part_id: undefined,
                part_add: true,
              }))
            }
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <PartDetailsCard
            selectedPartID={search.part_id}
            partAddMode={search.part_add}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <MeterTypesTable
            onSelectMeterType={(id: number) =>
              setSearch((prev) => ({
                ...prev,
                meter_type_id: id,
                meter_type_add: false,
              }))
            }
            onCreateMeterType={() =>
              setSearch((prev) => ({
                ...prev,
                meter_type_id: undefined,
                meter_type_add: true,
              }))
            }
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <MeterTypeDetailsCard
            selectedMeterType={selectedMeterType}
            meterTypeAddMode={search.meter_type_add}
          />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
