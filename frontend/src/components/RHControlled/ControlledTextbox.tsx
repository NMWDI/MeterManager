import { TextField } from "@mui/material";
import { Controller } from "react-hook-form";

const disabledInputStyle = {
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#000000",
  },
  cursor: "default",
};

export default function ControlledTextbox({
  name,
  control,
  ...childProps
}: any) {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={""}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          variant="outlined"
          size="small"
          fullWidth
          sx={disabledInputStyle}
          value={field.value ?? ""}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? ""}
          onBlur={(e) => {
            field.onBlur();
            childProps.onBlur?.(e);
          }}
          {...childProps}
        />
      )}
    />
  );
}
