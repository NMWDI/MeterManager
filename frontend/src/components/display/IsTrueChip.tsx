import { Chip } from "@mui/material";

export const IsTrueChip = ({ assert }: { assert: boolean }) => {
  return assert ? (
    <Chip sx={{ fontFamily: "monospace" }} variant="outlined" size="small" label="True" color="success" />
  ) : (
    <Chip sx={{ fontFamily: "monospace" }} variant="outlined" size="small" label="False" color="error" />
  );
}
