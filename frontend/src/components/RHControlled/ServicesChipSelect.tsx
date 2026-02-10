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
            onSelect={(selected_id) => {
              field.onChange([
                ...field.value,
                servicesList.data?.find(
                  (service: ServiceTypeLU) => service.id === selected_id,
                ),
              ]);
            }}
            onDelete={(delete_id) => {
              field.onChange(
                field.value.filter(
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
