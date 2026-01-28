import { useId, useState, useMemo } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  ListSubheader,
  useTheme,
  Grid,
  Alert,
  Button,
  AlertTitle,
} from "@mui/material";
import { useQuery, useQueryClient } from "react-query";
import { useAuthUser } from "react-auth-kit";
import { MonitoringWellsTable } from "./MonitoringWellsTable";
import { MonitoringWellsPlot } from "./MonitoringWellsPlot";
import {
  CreateModal,
  UpdateModal,
} from "../../components/Modals/MonitoredWell";
import {
  NewWellMeasurement,
  PatchWellMeasurement,
  ST2Measurement,
  SecurityScope,
  WellMeasurementDTO,
  MonitoredWell,
} from "../../interfaces";
import {
  useCreateWaterLevel,
  useUpdateWaterLevel,
  useDeleteWaterLevel,
} from "../../service/ApiServiceNew";
import dayjs, { Dayjs } from "dayjs";
import { useFetchWithAuth, useFetchST2 } from "../../hooks";
import { getDataStreamId } from "../../utils/DataStreamUtils";
import { MonitorHeart } from "@mui/icons-material";
import { BackgroundBox } from "../../components/BackgroundBox";
import { CustomCardHeader } from "../../components/CustomCardHeader";
import { separateAndSortMonitoredWells } from "../../utils";

export const MonitoringWellsView = () => {
  const theme = useTheme();

  const queryClient = useQueryClient();
  const fetchWithAuth = useFetchWithAuth();
  const fetchSt2 = useFetchST2();
  const selectWellId = useId();
  const [wellId, setWellId] = useState<number>();
  const [selectedMeasurement, setSelectedMeasurement] =
    useState<PatchWellMeasurement>({
      levelmeasurement_id: 0,
      timestamp: dayjs(),
      value: 0,
      submitting_user_id: 0,
    });

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const authUser = useAuthUser();
  const isAdmin = authUser()?.user_role.security_scopes.some(
    (s: SecurityScope) => s.scope_string === "admin",
  );

  const monitoredWellsQuery = useQuery<
    { items: MonitoredWell[] },
    Error,
    MonitoredWell[]
  >({
    queryKey: ["wells"],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/wells",
        params: {
          search_string: "monitoring",
          sort_by: "name",
          sort_direction: "asc",
        },
      }),
    select: (res) => res.items,
  });

  const {
    data: manualMeasurements,
    isLoading: isLoadingManual,
    error: errorManual,
    refetch: refetchManual,
  } = useQuery<WellMeasurementDTO[], Error>({
    queryKey: ["manualMeasurements", wellId],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/waterlevels",
        params: { well_ids: wellId },
      }),
    enabled: !!wellId,
  });

  const dataStreamId = useMemo(
    () => (wellId ? getDataStreamId(wellId) : undefined),
    [wellId],
  );

  const {
    data: st2Measurements,
    isLoading: isLoadingSt2,
    error: errorSt2,
  } = useQuery<ST2Measurement[], Error>({
    queryKey: ["st2Measurements", dataStreamId],
    queryFn: () =>
      fetchSt2("GET", `/Datastreams(${dataStreamId})/Observations`),
    enabled: !!dataStreamId,
  });

  const {
    data: johnsonSensorDataMeasurements,
    isLoading: isLoadingJohnsonSensorData,
    error: errorJohnsonSensorData,
  } = useQuery<WellMeasurementDTO[], Error>({
    queryKey: ["woodpeckers", wellId],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/waterlevels/woodpeckers",
        params: { well_id: wellId },
      }),
    enabled: !!wellId && wellId === 2599,
  });

  const createMeasurement = useCreateWaterLevel();
  const updateMeasurement = useUpdateWaterLevel(() => refetchManual());
  const deleteMeasurement = useDeleteWaterLevel();

  const error =
    monitoredWellsQuery.isError ||
    errorManual ||
    errorSt2 ||
    errorJohnsonSensorData;

  const handleSubmitNewMeasurement = (data: NewWellMeasurement) => {
    if (wellId) {
      data.well_id = wellId;
      createMeasurement.mutate(data, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["manualMeasurements", wellId],
          });
          refetchManual();
        },
      });
    }
    setIsNewModalOpen(false);
  };

  const handleSubmitMeasurementUpdate = () => {
    updateMeasurement.mutate(selectedMeasurement, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["manualMeasurements", wellId],
        });
      },
    });
    setIsUpdateModalOpen(false);
  };

  const handleDeleteMeasurement = () => {
    setIsUpdateModalOpen(false);
    if (window.confirm("Are you sure you want to delete this measurement?")) {
      deleteMeasurement.mutate(selectedMeasurement.levelmeasurement_id, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["manualMeasurements", wellId],
          });
        },
      });
    }
  };

  const handleMeasurementSelect = (rowdata: {
    row: {
      id: number;
      timestamp: Dayjs;
      value: number;
      submitting_user: {
        id: number;
      };
    };
  }) => {
    if (!isAdmin) return;
    setSelectedMeasurement({
      levelmeasurement_id: rowdata.row.id,
      timestamp: dayjs.utc(rowdata.row.timestamp).tz("America/Denver"),
      value: rowdata.row.value,
      submitting_user_id: rowdata.row.submitting_user.id,
    });
    setIsUpdateModalOpen(true);
  };

  const [outsideRecorderWells, regularWells] = separateAndSortMonitoredWells(
    monitoredWellsQuery?.data,
  );

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Monitored Well Values" icon={MonitorHeart} />
        <CardContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={() => monitoredWellsQuery.refetch()}
                >
                  Retry
                </Button>
              }
            >
              <AlertTitle>Error Loading Data</AlertTitle>
              We couldn’t load monitoring wells. Please check your connection or
              try again.
            </Alert>
          )}
          <FormControl
            size="small"
            sx={{ minWidth: "100px", maxWidth: 600, width: "100%" }}
            disabled={
              monitoredWellsQuery?.isFetching || !!monitoredWellsQuery?.isError
            }
          >
            <InputLabel id={`${selectWellId}-label`}>Site</InputLabel>
            <Select
              label="Site"
              labelId={`${selectWellId}-label`}
              value={wellId ?? ""}
              onChange={(e) => setWellId(Number(e.target.value))}
            >
              {monitoredWellsQuery?.isFetching && (
                <MenuItem disabled>Loading...</MenuItem>
              )}
              {monitoredWellsQuery?.isError && (
                <MenuItem disabled>Error loading wells</MenuItem>
              )}
              {(monitoredWellsQuery?.data?.length ?? 0 > 0) ? (
                <ListSubheader
                  sx={{
                    color: theme.palette.primary.main,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    paddingY: "0.125rem",
                  }}
                >
                  Wells
                </ListSubheader>
              ) : null}
              {regularWells.map((well) => (
                <MenuItem
                  key={well.id}
                  value={well.id}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor:
                        theme.palette.primary.dark + " !important",
                      color: theme.palette.primary.contrastText,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.primary.light,
                      color: theme.palette.primary.contrastText,
                    },
                  }}
                >
                  {well.name?.trim() ? well.name : "Unnamed Well"}
                </MenuItem>
              ))}
              {outsideRecorderWells.length > 0 ? (
                <ListSubheader
                  sx={{
                    color: theme.palette.secondary.main,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    paddingY: "0.125rem",
                  }}
                >
                  Outside Recorder Wells
                </ListSubheader>
              ) : null}
              {outsideRecorderWells.map((well) => (
                <MenuItem
                  key={well.id}
                  value={well.id}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor:
                        theme.palette.secondary.dark + " !important",
                      color: theme.palette.secondary.contrastText,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.secondary.light,
                      color: theme.palette.secondary.contrastText,
                    },
                  }}
                >
                  {well.name?.trim() ? well.name : "Unnamed Well"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid container spacing={2} sx={{ mt: "1rem" }}>
            <Grid item xs={12} lg={7}>
              <MonitoringWellsPlot
                isLoading={
                  isLoadingManual || isLoadingSt2 || isLoadingJohnsonSensorData
                }
                manual_dates={(Array.isArray(manualMeasurements)
                  ? manualMeasurements
                  : []
                ).map((m) => m.timestamp)}
                manual_vals={(Array.isArray(manualMeasurements)
                  ? manualMeasurements
                  : []
                ).map((m) => m.value)}
                logger_dates={
                  Array.isArray(st2Measurements)
                    ? (st2Measurements ?? []).map((m) => m.resultTime)
                    : []
                }
                logger_vals={
                  Array.isArray(st2Measurements)
                    ? st2Measurements.map((m) => m.result)
                    : []
                }
                sensor_dates={
                  Array.isArray(johnsonSensorDataMeasurements)
                    ? johnsonSensorDataMeasurements?.map((m) => m.timestamp)
                    : undefined
                }
                sensor_vals={
                  Array.isArray(johnsonSensorDataMeasurements)
                    ? johnsonSensorDataMeasurements?.map((m) => m.value)
                    : undefined
                }
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <MonitoringWellsTable
                rows={manualMeasurements ?? []}
                selectedWell={monitoredWellsQuery?.data?.find(
                  (well) => well.id == wellId,
                )}
                isWellSelected={!!wellId}
                onOpenModal={() => setIsNewModalOpen(true)}
                onMeasurementSelect={handleMeasurementSelect}
              />
            </Grid>
          </Grid>
          {authUser() && (
            <>
              <CreateModal
                open={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                handleSubmitNewMeasurement={handleSubmitNewMeasurement}
              />
              <UpdateModal
                open={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                measurement={selectedMeasurement}
                onUpdateMeasurement={(update) =>
                  setSelectedMeasurement({ ...selectedMeasurement, ...update })
                }
                onSubmitUpdate={handleSubmitMeasurementUpdate}
                onDeleteMeasurement={handleDeleteMeasurement}
              />
            </>
          )}
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
