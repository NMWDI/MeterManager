import { Controller } from "react-hook-form";

import MeterRegisterSelect from "../MeterRegisterSelect";

export const ControlledMeterRegisterSelect = ({
  control,
  name,
  ...childProps
}: any) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <MeterRegisterSelect
        selectedRegister={field.value}
        setSelectedRegister={field.onChange}
        meterType={childProps.meterType}
        {...childProps}
      />
    )}
  />
);
