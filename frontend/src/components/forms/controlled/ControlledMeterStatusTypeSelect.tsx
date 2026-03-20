import { useGetMeterStatusTypeList } from "@/service";
import { MeterStatus } from "@/interfaces";

import { ControlledSelect } from "./ControlledSelect";

export const ControlledMeterStatusTypeSelect = ({
  name,
  control,
  ...childProps
}: any) => {
  const statusTypeList = useGetMeterStatusTypeList();

  return (
    <ControlledSelect
      control={control}
      name={name}
      label="Meter Status"
      options={statusTypeList.data ?? []}
      getOptionLabel={(type: MeterStatus) => `${type.status_name}`}
      disabled={statusTypeList.isLoading}
      {...childProps}
      value={statusTypeList.isLoading ? "Loading..." : childProps.value}
    />
  );
};
