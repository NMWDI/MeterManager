import { useState, useEffect } from "react";
import { produce } from "immer";
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { Controller, useFieldArray } from "react-hook-form";
import { ImageUploadWithPreview, StyledToggleButton } from "../../../components";
import { NoteTypeLU } from "../../../interfaces";
import { WorkingOnArrivalValue } from "../../../enums";
import { useGetNoteTypes } from "../../../service/ApiServiceNew";

export default function NotesSelection({ control, watch }: any) {
  const notesList = useGetNoteTypes();

  // The default notes, and user-added ones from select dropdown
  const [visibleNoteIDs, setVisibleNoteIDs] = useState<number[]>([]);

  useEffect(() => {
    if (notesList.data) {
      const defaultNotes = notesList.data.filter(
        (note: any) => note.commonly_used == true,
      );
      setVisibleNoteIDs(defaultNotes.map((note: any) => note.id));
    }
  }, [notesList.data]);

  const { append, remove } = useFieldArray({
    control,
    name: "notes.selected_note_ids",
  });

  const isSelected = (ID: number) =>
    watch("notes.selected_note_ids")?.some((x: any) => x == ID);

  const unselectNote = (ID: number) => {
    const index = watch("notes.selected_note_ids")?.findIndex(
      (x: any) => x == ID,
    );
    remove(index);
  };

  const selectNote = (ID: number) => append(ID);

  const NoteToggleButton = ({ note }: any) => (
    <Grid item xs={12} sm={6} lg={3} key={note.id}>
      <StyledToggleButton
        value="check"
        selected={isSelected(note.id)}
        onChange={() => {
          isSelected(note.id) ? unselectNote(note.id) : selectNote(note.id);
        }}
        sx={{ flexGrow: 1, height: "100%" }}
      >
        {note.note}
      </StyledToggleButton>
    </Grid>
  );

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" fontWeight="bold">
        Notes
      </Typography>
      <Grid container sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <Controller
            name="notes.working_on_arrival_slug"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup {...field} color="primary" exclusive fullWidth>
                <StyledToggleButton value={WorkingOnArrivalValue.NotChecked}>
                  Working Status Not Checked
                </StyledToggleButton>
                <StyledToggleButton value={WorkingOnArrivalValue.Working}>
                  Meter Working On Arrival
                </StyledToggleButton>
                <StyledToggleButton value={WorkingOnArrivalValue.NotWorking}>
                  Meter Not Working On Arrival
                </StyledToggleButton>
              </ToggleButtonGroup>
            )}
          />
        </Grid>
        <Grid container item xs={12} sx={{ mt: 2 }} spacing={2}>
          {notesList.data?.map((note: any) => {
            if (visibleNoteIDs.some((x) => x == note.id)) {
              return <NoteToggleButton note={note} />;
            }
          })}
        </Grid>
        <Grid item xs={12} sm={4} sx={{ mt: 2, mr: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Add Other Notes</InputLabel>
            <Select
              value={""}
              label="Add Other Notes"
              onChange={(event: any) => {
                setVisibleNoteIDs(
                  produce(visibleNoteIDs, (newNotes) => {
                    newNotes.push(event.target.value);
                  }),
                );
                selectNote(event.target.value);
              }}
            >
              {notesList.data?.map((nt: NoteTypeLU) => {
                if (
                  !visibleNoteIDs.some((x) => x == nt.id) &&
                  ![
                    WorkingOnArrivalValue.Working,
                    WorkingOnArrivalValue.NotWorking,
                    WorkingOnArrivalValue.NotChecked,
                  ].some((x) => x == nt.slug)
                ) {
                  return (
                    <MenuItem key={nt.id} value={nt.id}>
                      {nt.note}
                    </MenuItem>
                  );
                }
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sx={{ mt: 2 }}>
          <ImageUploadWithPreview />
        </Grid>
      </Grid>
    </Box>
  );
}
