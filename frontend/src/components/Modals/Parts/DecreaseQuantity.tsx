import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { DecreaseQuantityPayload, Part } from "@/interfaces";
import { Save } from "@mui/icons-material";

export const DecreaseQuantityModal = ({
  open,
  onClose,
  parts,
  defaultPartId,
  onSubmit,
  title = "Decrease Part Quantity",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  parts: Part[];
  defaultPartId?: number | string;
  onSubmit: (payload: DecreaseQuantityPayload) => void;
  title?: string;
  loading?: boolean;
}) => {
  const partsById = useMemo(() => {
    const map = new Map<number | string, Part>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [decreaseBy, setDecreaseBy] = useState<string>("1");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [note, setNote] = useState<string>("");

  const decreaseByNum = Number(decreaseBy);
  const partError = !selectedPart;
  const qtyError =
    decreaseBy.trim().length === 0 ||
    Number.isNaN(decreaseByNum) ||
    !Number.isFinite(decreaseByNum) ||
    decreaseByNum <= 0;
  const dateError = !date;

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate(dayjs());
    setDecreaseBy("1");
    setNote("");

    if (defaultPartId !== undefined) {
      setSelectedPart(partsById.get(defaultPartId) ?? null);
    } else {
      setSelectedPart(null);
    }
  }, [open, defaultPartId, partsById]);

  const handleSubmit = () => {
    if (!selectedPart || qtyError || !date) {
      return;
    }

    onSubmit({
      part_id: selectedPart.id,
      count: Math.trunc(decreaseByNum),
      date: date.format("YYYY-MM-DDTHH:mm:ss"),
      note: note.trim().length ? note.trim() : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="decrease-qty-title"
      PaperProps={{ sx: { overflowX: "hidden" } }}
    >
      <DialogTitle id="decrease-qty-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Select a part, enter how many to remove, and choose the date for the
            parts used record.
          </Typography>

          <Autocomplete
            options={parts}
            value={selectedPart}
            onChange={(_, value) => setSelectedPart(value)}
            getOptionLabel={(option) =>
              option?.part_number
                ? `${option.part_number} — ${option.description ?? ""}`
                : (option?.description ?? "")
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Part"
                size="small"
                placeholder="Search by part # or description"
                error={partError}
                helperText={partError ? "Please select a part." : " "}
              />
            )}
          />

          <TextField
            label="Decrease by"
            type="number"
            size="small"
            value={decreaseBy}
            onChange={(e) => setDecreaseBy(e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            error={qtyError}
            helperText={qtyError ? "Enter a number greater than 0." : " "}
          />

          <DateTimePicker
            label="Date & Time"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            disableFuture
            format="MMM D, YYYY h:mm A"
            slotProps={{
              textField: {
                helperText: dateError ? "Date and time are required." : "Required.",
                error: dateError,
                fullWidth: true,
                size: "small",
              },
            }}
          />

          <TextField
            label="Note"
            size="small"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional inventory note"
            multiline
            minRows={2}
            maxRows={4}
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={onClose} disabled={loading} variant="text">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={!selectedPart || qtyError || dateError || loading}
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
          }}
          startIcon={<Save fontSize="small" />}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
