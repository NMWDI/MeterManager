import { useEffect, useMemo } from "react";
import { useGetMeterRegisterList } from "../service/ApiServiceNew";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormHelperText,
} from "@mui/material";
import { MeterRegister, MeterType } from "../interfaces";

function getRegisterTitle(register: MeterRegister) {
  //Describing the register can be a bit complex, so this function will return a string that describes the register
  if (register.brand == "Badger") {
    return "Badger Register: " + register.meter_size + " inch";
  }

  let seven_wheel = "";
  if (register.number_of_digits == 7) {
    seven_wheel = "(7 Wheel)";
  }
  return `${register.dial_units.name_short} - ${register.totalizer_units.name_short}, ${register.ratio} ${seven_wheel}`;
}

export default function MeterRegisterSelect({
  selectedRegister,
  setSelectedRegister,
  meterType,
  ...childProps
}: {
  selectedRegister?: MeterRegister;
  setSelectedRegister: (register: MeterRegister | null) => void;
  meterType?: MeterType;
  error?: boolean;
  helperText?: string;
}) {
  const meterRegisterList = useGetMeterRegisterList();

  //Filter the register list based on the meter type
  const filteredRegisterList = useMemo<MeterRegister[]>(() => {
    if (!meterType || meterTypeIsUnknown(meterType))
      return meterRegisterList.data ?? [];

    return (meterRegisterList.data ?? []).filter(
      (r: MeterRegister) =>
        r.meter_size == meterType.size &&
        r.brand.toLowerCase() == meterType.brand?.toLowerCase(),
    );
  }, [meterType, meterRegisterList.data]);

  //Check if the selected register is in the filtered list, if not, set it to null
  useEffect(() => {
    if (
      selectedRegister &&
      !filteredRegisterList?.some(
        (register: MeterRegister) => register.id === selectedRegister.id,
      )
    ) {
      setSelectedRegister(null);
    }
  }, [filteredRegisterList]);

  return (
    <FormControl size="small" fullWidth error={childProps.error}>
      <InputLabel>Meter Register</InputLabel>
      <Select
        value={
          meterRegisterList.isLoading ? "loading" : (selectedRegister?.id ?? "")
        }
        label="Meter Register"
        onChange={(event: any) =>
          setSelectedRegister(
            filteredRegisterList?.find(
              (reg) => reg.id === event.target.value,
            ) ?? null,
          )
        }
        {...childProps}
      >
        {filteredRegisterList?.map((register: MeterRegister) => {
          return (
            <MenuItem key={register.id} value={register.id}>
              {getRegisterTitle(register)}
            </MenuItem>
          );
        })}

        {meterRegisterList.isLoading && (
          <MenuItem value={"loading"} hidden>
            Loading...
          </MenuItem>
        )}
      </Select>
      {childProps.error && childProps.helperText && (
        <FormHelperText>{childProps.helperText}</FormHelperText>
      )}
    </FormControl>
  );
}

const meterTypeLabel = (
  meterType?: MeterType | string | null,
): string | null => {
  if (!meterType) return null;

  // If some code path passes a raw string
  if (typeof meterType === "string") {
    const s = meterType.trim();
    return s.length ? s : null;
  }

  // Prefer description (often includes "Unknown")
  const desc = meterType.description?.trim();
  if (desc) return desc;

  // Fall back to the same style you show in the select
  const brand = meterType.brand?.trim() ?? "";
  const model = meterType.model?.trim() ?? "";
  const series = meterType.series?.trim() ?? "";

  const label = [brand, series, model].filter(Boolean).join(" - ").trim();
  return label.length ? label : null;
};

const meterTypeIsUnknown = (meterType?: MeterType | string | null): boolean =>
  (meterTypeLabel(meterType) ?? "").toLowerCase().includes("unknown");
