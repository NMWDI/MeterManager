import { Controller } from "react-hook-form";
import WorkOrderSelect from "../WorkOrderSelect";

export function ControlledWorkOrderSelect({
  control,
  name,
  ...childProps
}: any) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <WorkOrderSelect
          {...childProps}
          selectedWorkOrderID={field.value}
          setSelectedWorkOrderID={(event: any) => {
            field.onChange(event);
          }}
        />
      )}
    />
  );
}
