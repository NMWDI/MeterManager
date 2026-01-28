import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { MeterListDTO, NewWorkOrder } from "@/interfaces";
import { MeterSelection } from "@/components";

interface NewWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  submitNewWorkOrder: (newWorkOrder: NewWorkOrder) => void;
}

export function NewWorkOrderModal({
  open,
  onClose,
  submitNewWorkOrder,
}: NewWorkOrderModalProps) {
  const [workOrderTitle, setWorkOrderTitle] = useState<string>("");
  const [workOrderMeter, setWorkOrderMeter] = useState<
    MeterListDTO | undefined
  >();
  const [meterSelectionError, setMeterSelectionError] =
    useState<boolean>(false);
  const [titleError, setTitleError] = useState<boolean>(false);

  function handleSubmit() {
    if (!workOrderMeter) {
      setMeterSelectionError(true);
      return;
    }
    if (!workOrderTitle) {
      setTitleError(true);
      return;
    }

    //If both fields are filled, submit the work order
    //Create a new work order object
    const newWorkOrder: NewWorkOrder = {
      date_created: new Date(),
      meter_id: workOrderMeter.id,
      title: workOrderTitle,
    };
    submitNewWorkOrder(newWorkOrder);
    onClose();

    //Reset the form
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  }

  const handleCancel = () => {
    onClose();
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="create-work-order"
    >
      <DialogTitle id="create-work-order">Create a New Work Order</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <DialogContentText>
            To create a new work order, please select a meter and title. Other
            fields can be edited as needed after creation.
          </DialogContentText>
          <MeterSelection
            selectedMeter={workOrderMeter}
            onMeterChange={setWorkOrderMeter}
            error={meterSelectionError}
          />
          <TextField
            autoFocus
            size="small"
            margin="dense"
            id="title"
            label="Title"
            type="text"
            fullWidth
            value={workOrderTitle}
            onChange={(event: any) => setWorkOrderTitle(event.target.value)}
            error={titleError}
            helperText={titleError ? "Title cannot be empty" : ""}
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
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
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
}
