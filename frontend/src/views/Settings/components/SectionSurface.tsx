import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export function SectionSurface({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.1),
        backgroundColor: alpha("#ffffff", 0.72),
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions}
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
