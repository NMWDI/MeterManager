import { DatePicker } from "@mui/x-date-pickers";
import { Controller } from "react-hook-form";

export const ControlledDatepicker = ({
  name,
  control,
  size = "small",
  ...childProps
}: any) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <DatePicker
        {...field}
        slotProps={{ textField: { size: size } }}
        {...childProps}
      />
    )}
  />
);
