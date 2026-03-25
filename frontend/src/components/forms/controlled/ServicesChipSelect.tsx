import { Controller } from "react-hook-form";

import { ServiceTypeLU } from "@/interfaces";
import { useGetServiceTypes } from "@/service";

import ChipSelect from "../ChipSelect";

export const ServicesChipSelect = ({ name, control }: any) => {
  const servicesList = useGetServiceTypes();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <ChipSelect
            selected_ids={
              field.value?.map((service: ServiceTypeLU) => service.id) ?? []
            }
            selected_values={
              field.value?.map((service: ServiceTypeLU) => ({
                id: service.id,
                name: service.service_name,
              })) ?? []
            }
            options={
              servicesList.data?.map((service: ServiceTypeLU) => ({
                id: service.id,
                name: service.service_name,
              })) ?? []
            }
            label="Services"
            onChange={(selected_ids) => {
              field.onChange(
                selected_ids
                  .map((selected_id) =>
                    servicesList.data?.find(
                      (service: ServiceTypeLU) => service.id === selected_id,
                    ),
                  )
                  .filter(Boolean),
              );
            }}
            onDelete={(delete_id) => {
              field.onChange(
                (field.value ?? []).filter(
                  (service: ServiceTypeLU) => service.id !== delete_id,
                ),
              );
            }}
          />
        );
      }}
    />
  );
};
