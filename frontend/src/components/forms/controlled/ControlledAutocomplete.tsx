import { Autocomplete } from "@mui/material";
import { Controller } from "react-hook-form";

const disabledInputStyle = {
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#000000",
  },
  cursor: "default",
};

export const ControlledAutocomplete = ({
  control,
  name,
  options = [],
  groupBy,
  getOptionLabel,
  isOptionEqualToValue,
  multiple = false,
  ...childProps
}: any) => (
  <Controller
    name={name}
    control={control}
    defaultValue={multiple ? [] : null}
    render={({ field }) => {
      const { value, onChange, ...restField } = field;

      const safeValue = multiple
        ? Array.isArray(value)
          ? value
          : []
        : (value ?? null);

      return (
        <Autocomplete
          {...restField}
          multiple={multiple}
          disableCloseOnSelect={multiple}
          options={options}
          groupBy={groupBy}
          getOptionLabel={getOptionLabel}
          isOptionEqualToValue={isOptionEqualToValue}
          value={safeValue}
          onChange={(_, newValue) => onChange(newValue)}
          sx={disabledInputStyle}
          {...childProps}
        />
      );
    }}
  />
);
