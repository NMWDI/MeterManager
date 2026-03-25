import { useEffect, useState, forwardRef } from "react";
import { TextField } from "@mui/material";
import { Controller } from "react-hook-form";
import { PatternFormat, PatternFormatProps } from "react-number-format";
import { GCSdimension } from "@/enums";

interface DMSInputProps {
  dimension_type: GCSdimension;
  value: number;
  onChange: (decimal_degrees: number) => void;
}

//This is from the MUI example
interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
}

const DMSFormatCustom = forwardRef<PatternFormatProps, CustomProps>(
  function PatternFormatCustom(props, ref) {
    const { onChange, ...other } = props;

    return (
      <PatternFormat
        {...other}
        getInputRef={ref}
        onValueChange={(values) => {
          onChange({
            target: {
              name: props.name,
              value: values.value,
            },
          });
        }}
        format="###&deg; ##' ##.###&quot;"
      />
    );
  },
);

//A function to convert decimal degrees to a DMS string which is a string of 10 numbers XXXXXXXXXX
//The numbers can be mapped to XXX degrees, XX minutes, and XX.XXX seconds in the UI
//It is assumed the app will only be used in the northern hemisphere and western hemisphere so the absolute value of the decimal degrees is used
function getDMSstringFromDecimalDegrees(decimal_degrees: number): string {
  decimal_degrees = Math.abs(decimal_degrees);
  const degrees = Math.floor(decimal_degrees);
  const minutes = Math.floor((decimal_degrees - degrees) * 60);
  const seconds = ((decimal_degrees - degrees) * 3600) % 60;
  const formattedSeconds = seconds.toFixed(3);
  return `${degrees.toString().padStart(3, "0")}${minutes.toString().padStart(2, "0")}${formattedSeconds.padStart(6, "0")}`;
}

function calculateDecimalDegreesFromDMS(
  dms_string: string,
  is_longitude: boolean,
): number {
  let multiplier = 1;
  if (is_longitude) {
    multiplier = -1;
  }

  const d = parseInt(dms_string.substring(0, 3));
  const m = parseInt(dms_string.substring(3, 5));
  const s = parseFloat(
    dms_string.substring(5, 7) + "." + dms_string.substring(7),
  );
  return multiplier * (d + m / 60 + s / 3600);
}

//Create a component that takes a label (latitude or longitude) and a callback function
//that will be called when the user enters a valid latitude or longitude.
//The 'value' prop will be controlled by the parent component.
function DMSInput({ dimension_type, value, onChange }: DMSInputProps) {
  const [dms_string, setDMSString] = useState<string>(
    getDMSstringFromDecimalDegrees(value),
  );

  if (dimension_type === GCSdimension.Latitude) {
    var dms_label = "Latitude (N)";
    var is_longitude = false;
  } else {
    var dms_label = "Longitude (W)";
    var is_longitude = true;
  }

  function handleUpdate(event: React.ChangeEvent<HTMLInputElement>) {
    let input_str = event.target.value;
    //Force fill in the string with 0s if length is less than 10
    if (input_str.length < 10) {
      let fill = 10 - input_str.length;
      for (let i = 0; i < fill; i++) {
        input_str += "0";
      }
    }
    setDMSString(input_str);
  }

  // Update underlying value from this component only when user leaves the input box, to avoid an infinite loop of updates caused by setting the underlying form value
  function handleBlur() {
    if (calculateDecimalDegreesFromDMS(dms_string, is_longitude) != value) {
      onChange(calculateDecimalDegreesFromDMS(dms_string, is_longitude));
    }
  }

  // Update display value when underlying value changes
  useEffect(() => {
    if (calculateDecimalDegreesFromDMS(dms_string, is_longitude) != value) {
      setDMSString(getDMSstringFromDecimalDegrees(value));
    }
  }, [value]);

  return (
    <TextField
      label={dms_label}
      value={dms_string}
      onChange={handleUpdate}
      onBlur={handleBlur}
      fullWidth
      size="small"
      InputProps={{
        inputComponent: DMSFormatCustom as any,
      }}
    />
  );
}

export const ControlledDMS = ({ name, control, ...childProps }: any) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <DMSInput
        {...childProps}
        value={childProps.value}
        onChange={(newValue) => field.onChange(newValue)}
      />
    )}
  />
);
