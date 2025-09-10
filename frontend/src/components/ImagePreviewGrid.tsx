import { useState } from "react";
import { Box, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const ImagePreviewGrid = ({ previews, onRemove }: {
  previews: string[];
  onRemove: (index: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleOpen = (src: string) => {
    setSelectedImage(src);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedImage(null);
  };

  return (
    <>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Preview{previews.length >= 2 ? "s" : null}:
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {previews.map((src, i) => (
            <Box
              key={i}
              sx={{
                position: "relative",
                width: 250,
                height: 250,
                borderRadius: 2,
                border: "1px solid #ddd",
                overflow: "hidden",
              }}
              onDoubleClick={() => handleOpen(src)}
            >
              <Box
                component="img"
                src={src}
                alt={`preview-${i}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <IconButton
                size="small"
                onClick={() => onRemove(i)}
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  border: "1px solid black",
                  "&:hover": {
                    backgroundColor: "rgba(255,0,0,0.8)",
                    color: "white",
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Box>
      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <DialogContent sx={{ p: 0, position: "relative" }}>
          <IconButton
            onClick={handleClose}
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
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
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
    </>
  );
};
