import { Controller } from "react-hook-form";

import { NoteTypeLU } from "@/interfaces";
import { useGetNoteTypes } from "@/service";

import ChipSelect from "../ChipSelect";

export const NotesChipSelect = ({ name, control }: any) => {
  const notesList = useGetNoteTypes();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <ChipSelect
            selected_ids={field.value?.map((note: NoteTypeLU) => note.id) ?? []}
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
            onChange={(selected_ids) => {
              field.onChange(
                selected_ids
                  .map((selected_id) =>
                    notesList.data?.find(
                      (note: NoteTypeLU) => note.id === selected_id,
                    ),
                  )
                  .filter(Boolean),
              );
            }}
            onDelete={(delete_id) => {
              field.onChange(
                (field.value ?? []).filter(
                  (note: NoteTypeLU) => note.id !== delete_id,
                ),
              );
            }}
          />
        );
      }}
    />
  );
};
