import { useState } from "react";
import { Grid, Button, Box, Typography, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";

const VisuallyHiddenInput = (props: any) => (
  <input
    style={{ display: "none" }}
    {...props}
  />
);

export const ImageUploadWithPreview = () => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...urls]); // append instead of replace

    event.target.value = "";
  };

  const handleRemove = (index: number) => {
    setPreviews((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      URL.revokeObjectURL(removed); // free memory
      return updated;
    });
  };

  return (
    <Grid item xs={12} sx={{ mt: 2, mr: 2 }}>
      <Button
        component="label"
        variant="contained"
        startIcon={<CloudUploadIcon />}
      >
        Upload photos
        <VisuallyHiddenInput
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </Button>

      {previews.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Preview{(previews?.length ?? 0) >= 2 ? "s" : null}:
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
                  onClick={() => handleRemove(i)}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "rgba(255,255,255,0.7)",
                    border: '1px solid black',
                    "&:hover": { backgroundColor: "rgba(255,0,0,0.8)", color: "white" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Grid>
  );
}

