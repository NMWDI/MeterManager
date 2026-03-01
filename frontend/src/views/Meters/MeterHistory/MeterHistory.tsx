import { useState, useEffect, useMemo } from "react";
import { Box, Card, CardContent, Grid } from "@mui/material";
import { ImageOutlined } from "@mui/icons-material";
import { useNavigate, useSearch } from "@tanstack/react-router";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { useGetMeterHistory } from "@/service";
import {
  MeterHistoryDTO,
  PatchActivityForm,
  PatchObservationForm,
} from "@/interfaces";
import { MeterHistoryType } from "@/enums";
import { CustomCardHeader, ImageDialog, ImagePreviewGrid } from "@/components";
import { MeterHistoryTable } from "@/views/Meters/MeterHistory/MeterHistoryTable";
import { SelectedActivityDetails } from "@/views/Meters/MeterHistory/SelectedActivityDetails";
import { SelectedObservationDetails } from "@/views/Meters/MeterHistory/SelectedObservationDetails";
import { SelectedBlankCard } from "@/views/Meters/MeterHistory/SelectedBlankCard";
import { assertDefined } from "@/utils";

export const MeterHistory = ({
  selectedMeterID,
}: {
  selectedMeterID?: number;
}) => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/manage/meters" });

  const meterHistoryQuery = useGetMeterHistory({ meter_id: selectedMeterID });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const selectedActivityId = search.activity_id;
  const selectedObservationId = search.observation_id;

  // Derive selected item from URL + loaded data
  const selectedHistoryItem = useMemo<MeterHistoryDTO | undefined>(() => {
    if (!meterHistoryQuery.data) return undefined;

    if (selectedActivityId !== undefined) {
      return meterHistoryQuery.data.find(
        (item) =>
          item.history_type === MeterHistoryType.Activity &&
          item.history_item.id === selectedActivityId,
      );
    }

    if (selectedObservationId !== undefined) {
      return meterHistoryQuery.data.find(
        (item) =>
          item.history_type === MeterHistoryType.Observation &&
          item.history_item.id === selectedObservationId,
      );
    }

    return undefined;
  }, [meterHistoryQuery.data, selectedActivityId, selectedObservationId]);

  // If URL points to an activity, scroll to history section once data is loaded
  useEffect(() => {
    if (!meterHistoryQuery.data) return;
    if (selectedActivityId === undefined && selectedObservationId === undefined)
      return;

    document
      .getElementById("meter_history")
      ?.scrollIntoView({ behavior: "smooth" });
  }, [meterHistoryQuery.data, selectedActivityId, selectedObservationId]);

  const photos = useMemo(() => {
    if (selectedHistoryItem?.history_type === MeterHistoryType.Activity) {
      return selectedHistoryItem.photos?.map((p: any) => p.url) ?? [];
    }
    return [];
  }, [selectedHistoryItem]);

  const handleDeleteItem = () => {
    // Clearing selection should clear URL too
    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        activity_id: undefined,
        observation_id: undefined,
      }),
      replace: true,
    });
  };

  const handleHistoryItemSelection = (historyItem: MeterHistoryDTO) => {
    if (historyItem.history_type === MeterHistoryType.Activity) {
      const id = historyItem.history_item.id;

      navigate({
        to: "/manage/meters",
        search: (prev) => ({
          ...(prev as any),
          activity_id: prev.activity_id === id ? undefined : id,
          observation_id: undefined,
        }),
      });
      return;
    }

    const id = historyItem.history_item.id;

    navigate({
      to: "/manage/meters",
      search: (prev) => ({
        ...(prev as any),
        observation_id: prev.observation_id === id ? undefined : id,
        activity_id: undefined,
      }),
    });
  };

  // Function to convert MeterHistoryDTO to PatchMeterActivity
  function convertHistoryActivity(
    historyItem: MeterHistoryDTO,
  ): PatchActivityForm {
    assertDefined(
      selectedMeterID,
      "No meter selected (selectedMeterID is undefined)",
    );

    let activity_details: PatchActivityForm = {
      activity_id: historyItem.history_item.id,
      meter_id: selectedMeterID,
      activity_date: dayjs
        .utc(historyItem.history_item.timestamp_start)
        .tz("America/Denver"),
      activity_start_time: dayjs
        .utc(historyItem.history_item.timestamp_start)
        .tz("America/Denver"),
      activity_end_time: dayjs
        .utc(historyItem.history_item.timestamp_end)
        .tz("America/Denver"),
      activity_type: historyItem.history_item.activity_type,

      submitting_user: historyItem.history_item.submitting_user,
      description: historyItem.history_item.description,
      well: historyItem.well,
      water_users: historyItem.history_item.water_users,

      notes: historyItem.history_item.notes,
      services: historyItem.history_item.services_performed,
      parts_used: historyItem.history_item.parts_used,

      ose_share: historyItem.history_item.ose_share,
    };
    return activity_details;
  }

  // Function to convert MeterHistoryDTO to PatchObservationForm
  function convertHistoryObservation(
    historyItem: MeterHistoryDTO,
  ): PatchObservationForm {
    let observation_details: PatchObservationForm = {
      observation_id: historyItem.history_item.id,
      submitting_user: historyItem.history_item.submitting_user,
      well: historyItem.well,
      observation_date: dayjs.utc(historyItem.date).tz("America/Denver"), //Convert to America/Denver
      observation_time: dayjs.utc(historyItem.date).tz("America/Denver"), //Convert to America/Denver
      property_type: historyItem.history_item.observed_property,
      unit: historyItem.history_item.unit,
      value: historyItem.history_item.value,
      ose_share: historyItem.history_item.ose_share,
      notes: historyItem.history_item.notes,
      meter_id: historyItem.history_item.meter_id,
    };

    return observation_details;
  }

  const hasMeter = Boolean(search.meter_id);
  const hasSelection =
    Boolean(search.activity_id) || Boolean(search.observation_id);

  const getDetailsCard = (historyItem?: MeterHistoryDTO): JSX.Element => {
    if (!hasMeter) return <></>;

    if (!hasSelection) return <SelectedBlankCard />;

    if (!historyItem) return <SelectedBlankCard isLoading={!historyItem} />;

    if (historyItem.history_type === MeterHistoryType.Activity) {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <SelectedActivityDetails
              onDeletion={handleDeleteItem}
              selectedActivity={convertHistoryActivity(historyItem)}
              afterSave={() => meterHistoryQuery.refetch()}
            />
          </Grid>
          {photos?.length > 0 ? (
            <Grid item xs={12}>
              <Card>
                <CustomCardHeader title="Image Previews" icon={ImageOutlined} />
                <CardContent>
                  <ImagePreviewGrid
                    previews={photos}
                    onOpen={(src) => {
                      setSelectedImage(src);
                      setDialogOpen(true);
                    }}
                  />
                  <ImageDialog
                    open={dialogOpen}
                    src={selectedImage}
                    onClose={() => setDialogOpen(false)}
                  />
                </CardContent>
              </Card>
            </Grid>
          ) : null}
        </Grid>
      );
    }

    return (
      <SelectedObservationDetails
        onDeletion={handleDeleteItem}
        selectedObservation={convertHistoryObservation(historyItem)}
        afterSave={() => meterHistoryQuery.refetch()}
      />
    );
  };

  return (
    <Box id="meter_history" sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ minHeight: "700px" }}>
        <Grid item xs={12} lg={6}>
          <MeterHistoryTable
            onHistoryItemSelection={handleHistoryItemSelection}
            selectedMeterHistory={meterHistoryQuery.data}
            isLoading={meterHistoryQuery.isLoading}
            selectedActivityId={selectedActivityId}
            selectedObservationId={search.observation_id}
          />
        </Grid>
        <Grid item xs={12} lg={6}>
          {getDetailsCard(selectedHistoryItem)}
        </Grid>
      </Grid>
    </Box>
  );
};
