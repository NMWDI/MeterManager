import { Controller } from "react-hook-form";

import { Part } from "@/interfaces";
import { useGetMeterPartsList } from "@/service/ApiServiceNew";

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
            selected_values={
              field.value?.map((part: Part) => ({
                id: part.id,
                name: part.part_type?.name + " " + part.part_number,
              })) ?? []
            }
            options={
              partsList.data?.map((part: Part) => ({
                id: part.id,
                name: part.part_type?.name + " " + part.part_number,
              })) ?? []
            }
            label="Parts Used"
            onSelect={(selected_id) => {
              field.onChange([
                ...field.value,
                partsList.data?.find((part: Part) => part.id === selected_id),
              ]);
            }}
            onDelete={(delete_id) => {
              field.onChange(
                field.value.filter((part: Part) => part.id !== delete_id),
              );
            }}
          />
        );
      }}
    />
  );
};
