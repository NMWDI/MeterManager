import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import HomeIcon from "@mui/icons-material/Home";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ScienceIcon from "@mui/icons-material/Science";
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

const publicLinks = [
  {
    title: "Chlorides",
    description:
      "Browse chloride measurements by region and review recent sampling data.",
    to: "/chlorides",
    icon: ScienceIcon,
    accent:
      "linear-gradient(135deg, rgba(16, 76, 129, 0.12) 0%, rgba(24, 197, 244, 0.22) 100%)",
  },
  {
    title: "Monitoring Wells",
    description:
      "Explore monitoring well readings, trends, and public well data in one place.",
    to: "/monitoringwells",
    icon: MonitorHeartIcon,
    accent:
      "linear-gradient(135deg, rgba(31, 77, 58, 0.12) 0%, rgba(105, 181, 93, 0.22) 100%)",
  },
] as const;

export const Home = () => {
  const summaryQuery = useGetHomeSummary();

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
                    <Stack spacing={2} alignItems="flex-start" textAlign="left">
                      <Typography variant="overline" color="text.secondary">
                        Public Data
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Access public measurements and well monitoring data.
                      </Typography>
                      <Stack spacing={1.5} sx={{ width: "100%" }}>
                        {publicLinks.map((item) => {
                          const Icon = item.icon;

                          return (
                            <Card
                              key={item.title}
                              variant="outlined"
                              sx={{
                                borderRadius: 3,
                                borderColor: "rgba(15, 23, 42, 0.08)",
                                background: item.accent,
                                transition:
                                  "transform 160ms ease, box-shadow 160ms ease",
                                "&:hover": {
                                  transform: "translateY(-2px)",
                                  boxShadow:
                                    "0 14px 32px rgba(15, 23, 42, 0.10)",
                                },
                              }}
                            >
                              <CardContent>
                                <Stack spacing={1.5}>
                                  <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                  >
                                    <Box
                                      sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2.5,
                                        display: "grid",
                                        placeItems: "center",
                                        bgcolor: "rgba(255,255,255,0.78)",
                                        color: "#0b3c6d",
                                      }}
                                    >
                                      <Icon />
                                    </Box>
                                    <Typography
                                      variant="h6"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {item.title}
                                    </Typography>
                                  </Stack>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {item.description}
                                  </Typography>
                                  <Box>
                                    <Button
                                      component={Link}
                                      to={item.to}
                                      variant="contained"
                                      endIcon={
                                        <ArrowOutwardIcon fontSize="small" />
                                      }
                                      sx={{
                                        borderRadius: 999,
                                        px: 2,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        boxShadow: "none",
                                      }}
                                    >
                                      Open {item.title}
                                    </Button>
                                  </Box>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
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
