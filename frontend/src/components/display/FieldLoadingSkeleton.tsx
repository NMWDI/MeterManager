import { Box, Skeleton } from "@mui/material";

export const FieldLoadingSkeleton = () => {
  return (
    <Box sx={{ width: "100%" }}>
      <Skeleton
        variant="rounded"
        width="100%"
        height={40}
        sx={{ borderRadius: 1 }}
      />
    </Box>
  );
};
