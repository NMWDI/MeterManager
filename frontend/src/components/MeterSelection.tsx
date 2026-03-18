import { useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useDebounce } from "use-debounce";
import { useGetMeterList } from "@/service";
import { MeterListDTO } from "@/interfaces";
import { MeterStatusNames } from "@/enums";

interface MeterSelectionProps {
  selectedMeter: MeterListDTO | undefined;
  onMeterChange: (selectedMeter: MeterListDTO | undefined) => void;
  error?: boolean;
}

export const MeterSelection = ({
  selectedMeter,
  onMeterChange,
  error,
}: MeterSelectionProps) => {
  const [meterSearchQuery, setMeterSearchQuery] = useState<string>("");
  const [meterSearchQueryDebounced] = useDebounce(meterSearchQuery, 250);

  const meterList = useGetMeterList({
    search_string:
      meterSearchQueryDebounced != "" ? meterSearchQueryDebounced : undefined,
    filter_by_status: [
      MeterStatusNames.Installed,
      MeterStatusNames.Warehouse,
      MeterStatusNames.Sold,
    ],
  });

  function getMeterListOptions(): MeterListDTO[] {
    if (meterList.isLoading) {
      return []; // If loading, provide an empty object literal
    } else {
      return meterList.data?.items ?? []; // If loaded, provide the list of meters
    }
  }

  function getOptionLabel(option: MeterListDTO) {
    if (meterList.isLoading) {
      return "Loading..."; // Label the empty object literal in the options as "Loading..." if meterList is loading
    } else {
      return (
        `${option.serial_number}` +
        (option.status ? `(${option.status?.status_name})` : "")
      );
    }
  }

  return (
    <Autocomplete
      disableClearable={true}
      options={getMeterListOptions()}
      getOptionLabel={(op: MeterListDTO) => getOptionLabel(op)}
      onChange={(_: any, selectedMeter: MeterListDTO) => {
        console.log(selectedMeter);
        onMeterChange(selectedMeter ?? undefined);
      }}
      value={selectedMeter ?? undefined}
      inputValue={meterSearchQuery}
      onInputChange={(_: any, query: string) => {
        setMeterSearchQuery(query);
      }}
      isOptionEqualToValue={(a, b) => {
        return a?.id == b?.id;
      }}
      renderInput={(params: any) => {
        if (params.inputProps.disabled) params.inputProps.value = "Loading...";
        return (
          <TextField
            {...params}
            required
            error={error}
            size="small"
            label="Meter"
            placeholder="Begin typing to search"
          />
        );
      }}
    />
  );
};
