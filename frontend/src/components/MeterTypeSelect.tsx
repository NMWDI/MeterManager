import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useGetMeterTypeList } from "@/service";
import { MeterTypeLU } from "@/interfaces";

export default function MeterTypeSelect({
  selectedMeterTypeID,
  setSelectedMeterTypeID,
  ...childProps
}: any) {
  const meterTypeList = useGetMeterTypeList();

  return (
    <FormControl size="small" fullWidth>
      <InputLabel>Meter Type</InputLabel>
      <Select
        value={
          meterTypeList.isLoading ? "loading" : (selectedMeterTypeID ?? "")
        }
        label="Meter Type"
        onChange={(event: any) => setSelectedMeterTypeID(event.target.value)}
        {...childProps}
      >
        {meterTypeList.data?.map((meterType: MeterTypeLU) => {
          return (
            <MenuItem key={meterType.id} value={meterType.id}>
              {meterType.brand + " - " + meterType.model}
            </MenuItem>
          );
        })}

        {meterTypeList.isLoading && (
          <MenuItem value={"loading"} hidden>
            Loading...
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
}
