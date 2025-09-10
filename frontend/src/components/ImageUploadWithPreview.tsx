import { useState } from "react";
import { Grid, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ImagePreviewGrid } from "./";

const VisuallyHiddenInput = (props: any) => (
  <input
    style={{ display: "none" }}
    {...props}
  />
);

export const ImageUploadWithPreview = ({ onFilesChange }: { onFilesChange?: (files: File[]) => void }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    setFiles((prev) => {
      const updated = [...prev, ...imageFiles];
      onFilesChange?.(updated); // bubble up to parent form
      return updated;
    });

    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...urls]); // append instead of replace

    event.target.value = "";
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      onFilesChange?.(updated);
      return updated;
    });

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
        <ImagePreviewGrid
          previews={previews}
          onRemove={handleRemove}
        />
      )}
    </Grid>
  );
}

