import { useState, useEffect } from "react";
import { Box, Grid } from "@mui/material";
import { MeterHistoryTable } from "./MeterHistoryTable";
import { SelectedActivityDetails } from "./SelectedActivityDetails";
import { SelectedObservationDetails } from "./SelectedObservationDetails";
import { SelectedBlankCard } from "./SelectedBlankCard";
import { useLocation, useSearchParams } from "react-router-dom";
import { useGetMeterHistory } from "../../../service/ApiServiceNew";
import {
  MeterHistoryDTO,
  PatchActivityForm,
  PatchObservationForm,
} from "../../../interfaces";
import { MeterHistoryType } from "../../../enums";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export const MeterHistory = ({
  selectedMeterID,
}: {
  selectedMeterID?: number;
}) => {
  const location = useLocation();
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>();
  const meterHistory = useGetMeterHistory({ meter_id: selectedMeterID });
  const [searchParams, setSearchParams] = useSearchParams();

  // If there is an activity_id in the URL, set the selectedHistoryItem to the corresponding item and scroll to it
  useEffect(() => {
    const activity_id = searchParams.get("activity_id") as number | null;

    if (meterHistory.data && activity_id !== null) {
      // Find the history item with the corresponding 'id'
      const load_history_item = meterHistory.data?.find(
        (item: MeterHistoryDTO) =>
          item.history_item.id == activity_id &&
          item.history_type == MeterHistoryType.Activity,
      );
      if (load_history_item) {
        setSelectedHistoryItem(load_history_item);

        // Find the element with the corresponding id
        const element = document.getElementById("meter_history");
        if (element) {
          // Scroll to the element
          element.scrollIntoView({ behavior: "smooth" });

          // Remove the hash from the URL so that the user can switch meters without scrolling
          location.hash = "";
        } else {
          console.error("element not found");
        }
      }
      // Clear the activity_id from the URL so it doesn't interfere later
      setSearchParams();
    }
  }, [meterHistory.data]); // Run the effect only when meter history changes otherwise there is a race condition

  function handleDeleteItem() {
    setSelectedHistoryItem(undefined);
  }

  function handleSaveItem() {
    //Update the meter history
    meterHistory.refetch();
  }

  // Function to convert MeterHistoryDTO to PatchMeterActivity
  function convertHistoryActivity(
    historyItem: MeterHistoryDTO,
  ): PatchActivityForm {
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

  const getDetailsCard = (historyItem?: MeterHistoryDTO): JSX.Element => {
    if (!historyItem) return <SelectedBlankCard />;

    if (historyItem.history_type === MeterHistoryType.Activity) {
      return (
        <SelectedActivityDetails
          onDeletion={handleDeleteItem}
          selectedActivity={convertHistoryActivity(historyItem)}
          afterSave={handleSaveItem}
        />
      );
    }

    return (
      <SelectedObservationDetails
        onDeletion={handleDeleteItem}
        selectedObservation={convertHistoryObservation(historyItem)}
        afterSave={handleSaveItem}
      />
    );
  };

  return (
    <Box id="meter_history" sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ minHeight: "700px" }}>
        <Grid item xs={6}>
          <MeterHistoryTable
            onHistoryItemSelection={setSelectedHistoryItem}
            selectedMeterHistory={meterHistory.data}
          />
        </Grid>
        <Grid item xs={6}>
          {getDetailsCard(selectedHistoryItem)}
        </Grid>
      </Grid>
    </Box>
  );
};
