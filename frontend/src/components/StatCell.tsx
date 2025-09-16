import { Stack, Typography } from "@mui/material";
import { formatNumberData } from "../utils";

export const StatCell = ({ label, value, isCount }: { label: string; value?: number, isCount?: boolean }) => {
  return (
    <Stack spacing={0.25} alignItems="center">
      <Typography variant="overline" sx={{ opacity: 0.8, lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography variant="h6">{formatNumberData(value)}{isCount ? "" : " ppm"}</Typography>
    </Stack>
  );
}
