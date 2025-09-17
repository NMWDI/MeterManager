import { useState } from "react";
import { Grid, Button, Typography, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ImageDialog, ImagePreviewGrid } from "./";
import { enqueueSnackbar } from "notistack";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const VisuallyHiddenInput = (props: any) => (
  <input
    style={{ display: "none" }}
    {...props}
  />
);

export const ImageUploadWithPreview = ({
  onFilesChange,
  fileLimit,
}: {
  onFilesChange?: (files: File[]) => void;
  fileLimit?: number;
}) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    let imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    // enforce max file size
    const tooBig = imageFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooBig.length > 0) {
      enqueueSnackbar(
        `Some files are too large. Max allowed size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        { variant: "error" }
      );
      imageFiles = imageFiles.filter((f) => f.size <= MAX_FILE_SIZE);
    }

    // enforce file limit
    setFiles((prev) => {
      let updated = [...prev];

      if (fileLimit) {
        const remaining = fileLimit - updated.length;

        if (remaining <= 0) {
          enqueueSnackbar(`You can only upload up to ${fileLimit} images.`, {
            variant: "warning",
          });
          event.target.value = "";
          return updated; // no changes
        }

        if (imageFiles.length > remaining) {
          enqueueSnackbar(`Only ${remaining} more image${remaining > 1 ? "s" : ""} allowed.`, {
            variant: "info",
          });
          imageFiles = imageFiles.slice(0, remaining);
        }
      }

      updated = [...updated, ...imageFiles];
      onFilesChange?.(updated);

      // set previews too
      const urls = imageFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prevPreviews) => [...prevPreviews, ...urls]);

      return updated;
    });

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
    <Grid item xs={12} sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={fileLimit !== undefined && files.length >= fileLimit} // disable when limit reached
        >
          Upload photos
          <VisuallyHiddenInput
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
        </Button>
        {fileLimit && (
          <Typography variant="body2" color="text.secondary">
            {files.length}/{fileLimit} images uploaded
          </Typography>
        )}
      </Box>
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

