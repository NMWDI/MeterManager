import { Controller } from "react-hook-form";

import { Part } from "@/interfaces";
import { useGetMeterPartsList } from "@/service";

import ChipSelect from "../ChipSelect";

export const PartsChipSelect = ({ name, control, meterid }: any) => {
  const partsList = useGetMeterPartsList({ meter_id: meterid });

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <ChipSelect
            selected_ids={field.value?.map((part: Part) => part.id) ?? []}
            selected_values={
              field.value?.map((part: Part) => ({
                id: part.id,
                name: [part.part_type?.name, part.part_number]
                  .filter(Boolean)
                  .join(" "),
              })) ?? []
            }
            options={
              partsList.data?.map((part: Part) => ({
                id: part.id,
                name: [part.part_type?.name, part.part_number]
                  .filter(Boolean)
                  .join(" "),
              })) ?? []
            }
            label="Parts Used"
            onChange={(selected_ids) => {
              field.onChange(
                selected_ids
                  .map((selected_id) =>
                    partsList.data?.find(
                      (part: Part) => part.id === selected_id,
                    ),
                  )
                  .filter(Boolean),
              );
            }}
            onDelete={(delete_id) => {
              field.onChange(
                (field.value ?? []).filter(
                  (part: Part) => part.id !== delete_id,
                ),
              );
            }}
          />
        );
      }}
    />
  );
};
