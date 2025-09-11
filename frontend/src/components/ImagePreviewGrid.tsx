import { memo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const ImagePreviewGrid = memo(({ previews, onRemove, onOpen }: {
  previews: string[];
  onRemove?: (index: number) => void;
  onOpen?: (src: string) => void;
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Preview{previews.length >= 2 ? "s" : null}:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {previews.map((src, i) => {
          return (
            <Box
              key={src}
              sx={{
                position: "relative",
                width: 250,
                height: 250,
                borderRadius: 2,
                border: "1px solid #ddd",
                overflow: "hidden",
              }}
              onDoubleClick={() => onOpen?.(src)}
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
              {onRemove && (
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
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

