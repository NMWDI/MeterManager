import { useState } from "react";
import { Grid, Button, Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

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

    // filter to images only
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    // create preview URLs
    const urls = imageFiles.map((file) => URL.createObjectURL(file));

    setPreviews(urls);
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
            Preview:
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
                component="img"
                src={src}
                alt={`preview-${i}`}
                sx={{
                  width: 200,
                  height: 200,
                  objectFit: "scale-down",
                  borderRadius: 1,
                  border: "1px solid #ddd",
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Grid>
  );
}
