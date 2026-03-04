import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { BackgroundBox, CustomCardHeader } from "@/components";
import pvacd_logo from "@/img/pvacd_logo.png";
import meter_field from "@/img/meter_field.jpg";
import meter_storage from "@/img/meter_storage.jpg";
import { useGetHomeSummary } from "@/service";

const formatStat = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("en-US") : "0";

const statCards = [
  {
    key: "completed_work_orders",
    label: "Work Orders Completed",
    icon: AssignmentTurnedInOutlinedIcon,
    color: "#1f4d3a",
  },
  {
    key: "repairs_processed",
    label: "Repairs",
    icon: BuildCircleOutlinedIcon,
    color: "#7c3f00",
  },
  {
    key: "reinstallations_processed",
    label: "Meter Reinstallations",
    icon: AutorenewOutlinedIcon,
    color: "#0f4c81",
  },
  {
    key: "preventative_maintenance_processed",
    label: "Preventative Maintenance Visits",
    icon: FactCheckOutlinedIcon,
    color: "#6a1b3f",
  },
] as const;

export const Home = () => {
  const summaryQuery = useGetHomeSummary();

  const versionHistory = [
    "V0.2.1 - ",
    "V0.2.0 - Add report functional with PDF download",
    "V0.1.52 - Deploy chlorides for admin testing",
    "V0.1.51 - Improved monitoring well page",
    "V0.1.50 - Fix wells map bug and update register if part used",
    "V0.1.49 - Add outside recorder wells to monitoring page",
    "V0.1.48 - Change well owner to be meter water users",
    "V0.1.47 - Add TRSS grids to meter map and fixed meter register save bug",
    "V0.1.46 - Change how data is displayed in Wells table",
    "V0.1.45 - Color code meter markers on map by last PM",
    "V0.1.44 - Fix bug in continuous monitoring well data and added data to OSE endpoint",
    'V0.1.43 - Fix navigation from work orders to activity, add OSE endpoint for "data issues"',
    "V0.1.42 - Fix pagination, add 'uninstall and hold'",
    "V0.1.41 - Add UI for water source on wells and some other minor changes",
  ];

  return (
    <BackgroundBox>
      <Card
        sx={{
          height: "fit-content",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #f8fbff 0%, #eef5ff 55%, #f6f9ff 100%)",
        }}
      >
        <CustomCardHeader title="Home" icon={HomeIcon} />
        <CardContent>
          <Grid container px={4} py={3} spacing={3} alignItems="flex-start">
            <Grid item xs={12} lg={7}>
              <Stack spacing={3}>
                <CardMedia
                  component="img"
                  loading="lazy"
                  image={pvacd_logo}
                  alt="PVACD Logo"
                  sx={{
                    maxWidth: 180,
                    width: "100%",
                    height: "auto",
                  }}
                />

                <Box
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 4,
                    color: "white",
                    background:
                      "linear-gradient(135deg, #0b3c6d 0%, #1a73e8 80%, #18c5f4 100%)",
                    boxShadow: "0 24px 60px rgba(22, 50, 34, 0.18)",
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    A complete system for managing meters, wells, and field
                    operations.
                  </Typography>
                </Box>

                <Grid container spacing={2.5} sx={{ m: 0, width: "100%" }}>
                  <Grid item xs={12}>
                    <Typography
                      variant="overline"
                      sx={{ letterSpacing: "0.12em", opacity: 0.82 }}
                    >
                      Since launch
                    </Typography>
                  </Grid>
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    const value = summaryQuery.data?.[card.key];

                    return (
                      <Grid item xs={12} sm={6} key={card.key}>
                        <Card
                          elevation={2}
                          variant="outlined"
                          sx={{
                            border: "2px solid black",
                            borderRadius: 4,
                            borderColor: "rgba(15, 23, 42, 0.08)",
                            background: "rgba(255, 255, 255, 0.78)",
                            backdropFilter: "blur(8px)",
                            height: "100%",
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1.5}>
                              <Box
                                sx={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: 2.5,
                                  display: "grid",
                                  placeItems: "center",
                                  bgcolor: card.color,
                                  color: "white",
                                }}
                              >
                                <Icon fontSize="small" />
                              </Box>
                              <Typography
                                variant="h4"
                                sx={{
                                  fontWeight: 800,
                                  letterSpacing: "-0.03em",
                                }}
                              >
                                {summaryQuery.isLoading ? (
                                  <Skeleton width={100} />
                                ) : (
                                  formatStat(value)
                                )}
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {card.label}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  justifyContent={{ xs: "space-around", lg: "space-between" }}
                  alignItems={{ xs: "center", sm: "stretch" }}
                  sx={{ width: "100%" }}
                >
                  <CardMedia
                    component="img"
                    loading="lazy"
                    image={meter_field}
                    alt="Field Meter"
                    sx={{
                      maxWidth: { xs: "100%", md: 200, xl: 220 },
                      width: "100%",
                      height: { xs: 220, md: "auto" },
                      objectFit: "cover",
                      borderRadius: 4,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
                    }}
                  />
                  <CardMedia
                    component="img"
                    loading="lazy"
                    image={meter_storage}
                    alt="Storage Meter"
                    sx={{
                      maxWidth: { xs: "100%", md: 200, xl: 220 },
                      width: "100%",
                      height: { xs: 220, md: "auto" },
                      objectFit: "cover",
                      borderRadius: 4,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
                    }}
                  />
                </Stack>

                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 4,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,246,255,0.96) 100%)",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1} alignItems="flex-start" textAlign="left">
                      <Typography variant="overline" color="text.secondary">
                        Release Notes
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Version History
                      </Typography>
                      <List dense sx={{ width: "100%" }}>
                        {versionHistory.map((version) => (
                          <ListItem
                            key={version}
                            disablePadding
                            sx={{ py: 0.25 }}
                          >
                            <ListItemText primary={version} />
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
