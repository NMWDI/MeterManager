import { Controller } from "react-hook-form";
import { NoteTypeLU, ServiceTypeLU, PartTypeLU } from "@/interfaces";
import {
  useGetNoteTypes,
  useGetServiceTypes,
  useGetPartTypeList,
} from "@/service";

import ChipSelect from "../ChipSelect";

type SelectType = "Notes" | "Services" | "Parts";

export default function NSPChipSelect({
  name,
  control,
  select_type,
}: {
  name: string;
  control: any;
  select_type: SelectType;
}) {
  function getOptions() {
    switch (select_type) {
      case "Notes":
        return useGetNoteTypes();
      case "Services":
        return useGetServiceTypes();
      case "Parts":
        return useGetPartTypeList();
    }
  }

  //Function that takes an item from the options list and converts it to a chip item
  //Chip select item is simply {id: number, name: string}
  function convertChipItems(items: any) {
    switch (select_type) {
      case "Notes":
        return items.map((note: NoteTypeLU) => ({
          id: note.id,
          name: note.note,
        }));
      case "Services":
        return items.map((service: ServiceTypeLU) => ({
          id: service.id,
          name: service.service_name,
        }));
      case "Parts":
        return items.map((part: PartTypeLU) => ({
          id: part.id,
          name: part.name,
        }));
    }
  }

  //Find an option in the option list by id
  function findOptionById(id: number, optionsList: any) {
    return optionsList.data?.find((option: any) => option.id === id);
  }

  const optionsList = getOptions();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        console.log(field);
        return (
          <ChipSelect
            selected_values={field.value ? convertChipItems(field.value) : []}
            options={
              optionsList?.data ? convertChipItems(optionsList.data) : []
            }
            label={select_type}
            onSelect={(selected_id) => {
              field.onChange([
                ...field.value,
                findOptionById(selected_id, optionsList),
              ]);
            }}
            onDelete={(delete_id) => {
              field.onChange(
                field.value.filter((option: any) => option.id !== delete_id),
              );
            }}
          />
        );
      }}
    />
  );
}
