import { useGetActivityTypeList } from "@/service";
import { ActivityTypeLU } from "@/interfaces";
import { ControlledSelect } from "./ControlledSelect";

export const ControlledActivitySelect = ({
  name,
  control,
  ...childProps
}: any) => {
  const activityTypeList = useGetActivityTypeList();

  return (
    <ControlledSelect
      control={control}
      name={name}
      options={activityTypeList.data ?? []}
      getOptionLabel={(option: ActivityTypeLU) => option.name}
      label="Activity Type"
      disabled={activityTypeList.isLoading}
      {...childProps}
      value={activityTypeList.isLoading ? "Loading..." : childProps.value}
    />
  );
};
