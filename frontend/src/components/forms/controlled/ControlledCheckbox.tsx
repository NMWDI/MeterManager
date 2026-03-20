import { Checkbox, FormControlLabel } from "@mui/material";
import { Controller } from "react-hook-form";

const disabledInputStyle = {
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#000000",
  },
  cursor: "default",
};

export const ControlledCheckbox = ({ name, control, ...childProps }: any) => (
  <Controller
    name={name}
    control={control}
    defaultValue={false}
    render={({ field }) => {
      return (
        <FormControlLabel
          control={
            <Checkbox
              onChange={field.onChange}
              checked={field.value}
              size="small"
              sx={disabledInputStyle}
            />
          }
          {...childProps}
        />
      );
    }}
  />
);
