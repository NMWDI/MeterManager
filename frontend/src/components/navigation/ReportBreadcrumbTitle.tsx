import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Box, Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { Link as RouterLink } from "@tanstack/react-router";

export const ReportBreadcrumbTitle = ({ current }: { current: string }) => {
  return (
    <Breadcrumbs
      aria-label="report breadcrumb"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{
        color: "inherit",
        "& .MuiBreadcrumbs-ol": {
          alignItems: "center",
        },
        "& .MuiBreadcrumbs-separator": {
          display: "inline-flex",
          alignItems: "center",
          color: "rgba(255, 255, 255, 0.72)",
          mx: 1,
        },
      }}
    >
      <MuiLink
        component={RouterLink}
        to="/reports"
        underline="hover"
        color="inherit"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        <AssessmentOutlinedIcon sx={{ fontSize: "1.1rem", display: "block" }} />
        <Box component="span">Reports</Box>
      </MuiLink>
      <Typography
        component="span"
        color="inherit"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {current}
      </Typography>
    </Breadcrumbs>
  );
};
