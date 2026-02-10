import ChipSelect from "../ChipSelect";
import { NoteTypeLU } from "@/interfaces";
import { useGetNoteTypes } from "@/service/ApiServiceNew";

import { Controller } from "react-hook-form";

export const NotesChipSelect = ({ name, control }: any) => {
  const notesList = useGetNoteTypes();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <ChipSelect
            selected_values={
              field.value?.map((note: NoteTypeLU) => ({
                id: note.id,
                name: note.note,
              })) ?? []
            }
            options={
              notesList.data?.map((note: NoteTypeLU) => ({
                id: note.id,
                name: note.note,
              })) ?? []
            }
            label="Notes"
            onSelect={(selected_id) => {
              field.onChange([
                ...field.value,
                notesList.data?.find(
                  (note: NoteTypeLU) => note.id === selected_id,
                ),
              ]);
            }}
            onDelete={(delete_id) => {
              field.onChange(
                field.value.filter((note: NoteTypeLU) => note.id !== delete_id),
              );
            }}
          />
        );
      }}
    />
  );
};
