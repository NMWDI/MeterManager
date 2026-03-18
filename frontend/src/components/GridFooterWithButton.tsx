import { Box } from "@mui/material";
import { GridPagination } from "@mui/x-data-grid";
import { ReactNode } from "react";

export const GridFooterWithButton = ({ button }: { button: ReactNode }) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Box sx={{ my: "auto" }}>{button}</Box>
      <GridPagination />
    </Box>
  );
};
