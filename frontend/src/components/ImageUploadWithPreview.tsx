import { useState } from "react";
import { Grid, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ImageDialog, ImagePreviewGrid } from "./";
import { enqueueSnackbar } from "notistack";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const VisuallyHiddenInput = (props: any) => (
  <input
    style={{ display: "none" }}
    {...props}
  />
);

export const ImageUploadWithPreview = ({ onFilesChange }: { onFilesChange?: (files: File[]) => void }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    const tooBig = imageFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooBig.length > 0) {
      enqueueSnackbar(
        `Some files are too large. Max allowed size is ${MAX_FILE_SIZE / 1024 / 1024
        } MB`,
        { variant: "error" }
      );
      event.target.value = "";
      return;
    }

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
        <>
          <ImagePreviewGrid
            previews={previews}
            onRemove={handleRemove}
            onOpen={(src) => {
              setSelectedImage(src);
              setDialogOpen(true);
            }}
          />
          <ImageDialog
            open={dialogOpen}
            src={selectedImage}
            onClose={() => setDialogOpen(false)}
          />
        </>
      )}
    </Grid>
  );
}

