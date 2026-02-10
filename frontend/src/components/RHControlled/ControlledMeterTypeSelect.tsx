import { useGetMeterTypeList } from "@/service/ApiServiceNew";
import { MeterTypeLU } from "@/interfaces";

import { ControlledSelect } from "./ControlledSelect";

export const ControlledMeterTypeSelect = ({
  name,
  control,
  ...childProps
}: any) => {
  const meterTypeList = useGetMeterTypeList();

  return (
    <ControlledSelect
      control={control}
      name={name}
      label="Meter Type"
      options={meterTypeList.data ?? []}
      getOptionLabel={(type: MeterTypeLU) => `${type.brand} - ${type.model}`}
      disabled={meterTypeList.isLoading}
      {...childProps}
      value={meterTypeList.isLoading ? "Loading..." : childProps.value}
    />
  );
};
