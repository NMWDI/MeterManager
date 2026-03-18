import { Box, Modal, Button, Grid } from "@mui/material";
import { useState, useEffect } from "react";
import { useMergeWells } from "@/service";
import { Well } from "@/interfaces";

import WellSelection from "./WellSelection";

export function MergeWellModal({
  isWellMergeModalOpen,
  handleCloseMergeModal,
  handleSuccess,
  mergeWell_raNumber,
}: {
  isWellMergeModalOpen: boolean;
  handleCloseMergeModal: () => void;
  handleSuccess: () => void;
  mergeWell_raNumber: string;
}) {
  const [targetWell, setTargetWell] = useState<Well | null>(null);
  const [disableMergeButton, setDisableMergeButton] = useState<boolean>(true);

  const mergeWells = useMergeWells(handleSuccess);

  const handleSubmit = () => {
    let targetWell_raNumber = targetWell?.ra_number ?? "";
    console.log(
      "Merging well: " + mergeWell_raNumber + " into " + targetWell_raNumber,
    );

    //Prevent merge if mergeWell and targetWell are the same
    if (mergeWell_raNumber == targetWell_raNumber) {
      console.log("Cannot merge well into itself");
      setTargetWell(null);
      handleCloseMergeModal();
      return;
    }

    mergeWells.mutate({
      merge_well: mergeWell_raNumber,
      target_well: targetWell_raNumber,
    });
    setTargetWell(null);
    handleCloseMergeModal();
  };

  //Clear targetWell on cancel button
  const handleCancelMergeModal = () => {
    setTargetWell(null);
    handleCloseMergeModal();
  };

  //Enable merge button if targetWell is selected
  useEffect(() => {
    if (targetWell) {
      setDisableMergeButton(false);
    } else {
      setDisableMergeButton(true);
    }
  }, [targetWell]);

  return (
    <Modal open={isWellMergeModalOpen} onClose={handleCloseMergeModal}>
      <Box
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          paddingRight: 20,
          paddingBottom: 20,
          boxShadow: "24",
          borderRadius: 15,
          paddingLeft: 25,
        }}
      >
        <Grid item xs={12}>
          <h2>Well Merge</h2>
          <Grid container item xs={12} sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            Merge all meter history from {mergeWell_raNumber} into target well:
          </Grid>
          <Grid container item xs={12} sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <WellSelection
              selectedWell={targetWell}
              onSelection={setTargetWell}
            />
          </Grid>
          <Grid
            container
            item
            spacing={2}
            xs={6}
            sx={{ mr: "auto", ml: "auto" }}
          >
            <Grid item>
              <Button
                type="submit"
                variant="contained"
                onClick={handleSubmit}
                disabled={disableMergeButton}
              >
                Merge
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" onClick={handleCancelMergeModal}>
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}
