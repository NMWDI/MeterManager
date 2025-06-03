import { useEffect, useState } from "react";
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
  const [filteredRegisterList, setFilteredRegisterList] = useState<
    MeterRegister[] | undefined
  >([]);

  //Filter the register list based on the meter type
  useEffect(() => {
    if (meterType) {
      setFilteredRegisterList(
        meterRegisterList.data?.filter(
          (register: MeterRegister) =>
            register.meter_size == meterType.size &&
            register.brand.toLowerCase() == meterType.brand?.toLowerCase(),
        ),
      );
    } else {
      setFilteredRegisterList(meterRegisterList.data);
    }
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
