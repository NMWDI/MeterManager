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
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { Part, IncreaseQuantityPayload } from "@/interfaces";
import { Save } from "@mui/icons-material";

export const IncreaseQuantityModal = ({
  open,
  onClose,
  parts,
  defaultPartId,
  onSubmit,
  title = "Increase Part Quantity",
}: {
  open: boolean;
  onClose: () => void;
  parts: Part[];
  defaultPartId?: number | string;
  onSubmit: (payload: IncreaseQuantityPayload) => void;
  title?: string;
}) => {
  const partsById = useMemo(() => {
    const map = new Map<number | string, Part>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [increaseBy, setIncreaseBy] = useState<string>("1");
  const [date, setDate] = useState<Dayjs | null>(dayjs());

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
      partId: selectedPart.id,
      increaseBy: Math.trunc(increaseByNum),
      date: date?.format("YYYY-MM-DD"),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="increase-qty-title"
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

          <DatePicker
            label="Date"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            disableFuture
            slotProps={{
              textField: {
                helperText: "Defaults to today.",
                fullWidth: true,
                size: "small",
              },
            }}
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
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={!selectedPart || qtyError}
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
          }}
          startIcon={<Save fontSize="small" />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
