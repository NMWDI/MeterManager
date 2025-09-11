import { Dialog, DialogContent, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const ImageDialog = ({
  open,
  src,
  onClose,
}: {
  open: boolean;
  src: string | null;
  onClose: () => void;
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogContent sx={{ p: 0, position: "relative" }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "white",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
        >
          <CloseIcon />
        </IconButton>
        {src && (
          <Box
            component="img"
            src={src}
            alt="full-preview"
            sx={{
              maxWidth: "100%",
              maxHeight: "80vh",
              display: "block",
              margin: "auto",
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
