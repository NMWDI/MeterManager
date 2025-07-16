import {
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { Controller } from "react-hook-form";

export function ControlledSelect({
  control,
  name,
  size = "small",
  multiple = false,
  ...childProps
}: any) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const isMultiple = multiple;

        // Normalize value for multi/single mode
        const value = isMultiple
          ? (field.value?.map((v: any) => v.id) ?? [])
          : (field.value?.id ?? "");

        const handleChange = (event: any) => {
          if (isMultiple) {
            const selectedIds = event.target.value;
            const selectedOptions = childProps.options.filter((opt: any) =>
              selectedIds.includes(opt.id),
            );
            field.onChange(selectedOptions);
          } else {
            const selectedOption = childProps.options.find(
              (opt: any) => opt.id === event.target.value,
            );
            field.onChange(selectedOption);
          }
        };

        return (
          <FormControl
            size={size}
            fullWidth
            error={childProps.error != undefined}
            sx={childProps.sx}
          >
            <InputLabel>{childProps.label}</InputLabel>
            <Select
              multiple={isMultiple}
              value={value}
              onChange={handleChange}
              defaultValue={isMultiple ? [] : ""}
              label={childProps.label}
              renderValue={(selected: any) =>
                isMultiple
                  ? childProps.options
                      .filter((opt: any) => selected.includes(opt.id))
                      .map((opt: any) => childProps.getOptionLabel(opt))
                      .join(", ")
                  : childProps.getOptionLabel(
                      childProps.options.find(
                        (opt: any) => opt.id === selected,
                      ) ?? {},
                    )
              }
            >
              {childProps.options.map((option: any) => (
                <MenuItem key={option.id} value={option.id}>
                  {childProps.getOptionLabel(option)}
                </MenuItem>
              ))}
              {childProps.value === "Loading..." && (
                <MenuItem value="Loading...">Loading...</MenuItem>
              )}
            </Select>
            {childProps.error && (
              <FormHelperText>{childProps.error}</FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
}

// Performs like a normal select where standard type options are passed in and selected (ints, bools, etc)
export function ControlledSelectNonObject({
  control,
  name,
  ...childProps
}: any) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControl
          size="small"
          fullWidth
          error={childProps.error != undefined}
          sx={childProps.sx}
        >
          <InputLabel>{childProps.label}</InputLabel>
          <Select
            {...field}
            {...childProps}
            sx={undefined}
            value={field.value ?? ""}
            defaultValue={""}
          >
            {childProps.options.map((option: any) => (
              <MenuItem value={option} key={option}>
                {childProps.getOptionLabel(option)}
              </MenuItem>
            ))}
            {childProps.value == "Loading..." && (
              <MenuItem value="Loading...">Loading...</MenuItem>
            )}
          </Select>
          {childProps.error && (
            <FormHelperText key={childProps.error}>
              {childProps.error}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
