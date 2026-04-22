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
import { Part } from "@/interfaces";
import { IncreaseQuantityPayload } from "@/interfaces/IncreaseQuantityPayload";
import { Save } from "@mui/icons-material";

export const IncreaseQuantityModal = ({
  open,
  onClose,
  parts,
  defaultPartId,
  onSubmit,
  title = "Increase Part Quantity",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  parts: Part[];
  defaultPartId?: number | string;
  onSubmit: (payload: IncreaseQuantityPayload) => void;
  title?: string;
  loading?: boolean;
}) => {
  const partsById = useMemo(() => {
    const map = new Map<number | string, Part>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [increaseBy, setIncreaseBy] = useState<string>("1");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [note, setNote] = useState<string>("");

  const increaseByNum = Number(increaseBy);

  const partError = !selectedPart;
  const qtyError =
    increaseBy.trim().length === 0 ||
    Number.isNaN(increaseByNum) ||
    !Number.isFinite(increaseByNum) ||
    increaseByNum <= 0;

  // When opening, set defaults (today + optional part)
  useEffect(() => {
    if (!open) return;

    setDate(dayjs());
    setIncreaseBy("1");
    setNote("");

    if (defaultPartId !== undefined) {
      const p = partsById.get(defaultPartId) ?? null;
      setSelectedPart(p);
    } else {
      setSelectedPart(null);
    }
  }, [open, defaultPartId, partsById]);

  const handleSubmit = () => {
    if (!selectedPart || qtyError) return;

    onSubmit({
      part_id: selectedPart.id,
      count: Math.trunc(increaseByNum),
      date: date?.format("YYYY-MM-DDTHH:mm:ss"),
      note: note.trim().length ? note.trim() : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="increase-qty-title"
      PaperProps={{ sx: { overflowX: "hidden" } }}
    >
      <DialogTitle id="increase-qty-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Select a part, enter how many to add, and confirm the date.
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
            label="Increase by"
            type="number"
            size="small"
            value={increaseBy}
            onChange={(e) => setIncreaseBy(e.target.value)}
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
                helperText: "Defaults to now.",
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
            placeholder="Optional note (e.g., received shipment, inventory correction)"
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
          disabled={!selectedPart || qtyError || loading}
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
