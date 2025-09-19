import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  MeterListDTO,
  NewWorkOrder,
} from "../../interfaces";
import MeterSelection from "../../components/MeterSelection";

interface NewWorkOrderModalProps {
  openNewWorkOrderModal: boolean;
  closeNewWorkOrderModal: () => void;
  submitNewWorkOrder: (newWorkOrder: NewWorkOrder) => void;
}

export function NewWorkOrderModal({
  openNewWorkOrderModal,
  closeNewWorkOrderModal,
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
    closeNewWorkOrderModal();

    //Reset the form
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  }

  const handleCancel = () => {
    closeNewWorkOrderModal();
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  };

  return (
    <Dialog open={openNewWorkOrderModal} onClose={closeNewWorkOrderModal}>
      <DialogTitle>Create a New Work Order</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}
