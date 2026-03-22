import { useEffect, useId, useState, useMemo } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  ListSubheader,
  useTheme,
  Box,
} from "@mui/material";
import { useQuery, useQueryClient } from "react-query";
import { useAuthUser } from "react-auth-kit";
import { enqueueSnackbar } from "notistack";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import {
  NewWellMeasurement,
  PatchWellMeasurement,
  ST2Measurement,
  SecurityScope,
  WellMeasurementDTO,
  MonitoredWell,
} from "@/interfaces";
import {
  useCreateWaterLevel,
  useUpdateWaterLevel,
  useDeleteWaterLevel,
} from "@/service";
import { useFetchWithAuth, useFetchST2 } from "@/hooks";
import { getDataStreamId, separateAndSortMonitoredWells } from "@/utils";
import { MonitorHeart } from "@mui/icons-material";
import { CreateModal, UpdateModal } from "@/components/Modals/MonitoredWell";
import {
  CustomCardHeader,
  BackgroundBox,
  FieldLoadingSkeleton,
  QueryErrorBox,
  ResizableSplitPanels,
} from "@/components";
import {
  MonitoringWellsPlotSection,
  MonitoringWellsTableSection,
} from "@/views/MonitoringWells";
import { optionalPositiveInt, pageParam, routeSearchHydrator } from "@/utils";

const searchSchema = z.object({
  wellId: optionalPositiveInt.catch(undefined).default(undefined),
  page: pageParam(0, 0),
  pageSize: pageParam(25, 10),
  split: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const n = Number(val);
      return Number.isInteger(n) && n >= 35 && n <= 72 ? n : undefined;
    }, z.number().int().min(35).max(72).optional())
    .catch(undefined)
    .default(undefined),
});

const MONITORING_WELLS_SPLIT_STORAGE_KEY = "monitoringwells-split-width";

export const Route = createFileRoute("/monitoringwells")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: MonitoringWells,
});

function MonitoringWells() {
  const theme = useTheme();

  const navigate = useNavigate();
  const { wellId, split } = Route.useSearch();
  const queryClient = useQueryClient();
  const fetchWithAuth = useFetchWithAuth();
  const fetchSt2 = useFetchST2();
  const uniqueSelectId = useId();
  const [selectedMeasurement, setSelectedMeasurement] = useState<
    Partial<PatchWellMeasurement>
  >({
    levelmeasurement_id: 0,
    timestamp: dayjs(),
    value: 0,
    submitting_user_id: 0,
  });

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    if (split !== undefined) {
      return;
    }

    const storedSplit = window.localStorage.getItem(
      MONITORING_WELLS_SPLIT_STORAGE_KEY,
    );
    if (!storedSplit) {
      return;
    }

    const parsedSplit = Number(storedSplit);
    if (
      !Number.isInteger(parsedSplit) ||
      parsedSplit < 35 ||
      parsedSplit > 72
    ) {
      return;
    }

    navigate({
      to: "/monitoringwells",
      search: (prev) => ({
        ...(prev as any),
        split: parsedSplit,
      }),
      replace: true,
    });
  }, [navigate, split]);

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

  const handleSubmitNewMeasurement = (data: Partial<NewWellMeasurement>) => {
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

    const id = selectedMeasurement.levelmeasurement_id;
    if (!id) {
      enqueueSnackbar("No measurement selected to delete.", {
        variant: "warning",
      });
      return;
    }

    if (window.confirm("Are you sure you want to delete this measurement?")) {
      deleteMeasurement.mutate(id, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["manualMeasurements", wellId],
          });
          enqueueSnackbar("Measurement deleted.", { variant: "success" });
        },
        onError: (e: any) => {
          enqueueSnackbar(e?.message ?? "Failed to delete measurement.", {
            variant: "error",
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
  const plotLoadingSources = [
    isLoadingManual ? "Manual" : null,
    isLoadingSt2 ? "Continuous" : null,
    isLoadingJohnsonSensorData ? "Woodpecker" : null,
  ].filter((source): source is string => source !== null);

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Monitored Wells" icon={MonitorHeart} />
        <CardContent>
          <Box sx={{ minWidth: "100px", maxWidth: 600, width: "100%" }}>
            {monitoredWellsQuery.isLoading ? (
              <FieldLoadingSkeleton />
            ) : monitoredWellsQuery.isError ? (
              <QueryErrorBox
                title="Unable to Load Monitoring Wells"
                message={
                  monitoredWellsQuery.error?.message ||
                  "We couldn’t load the list of monitored wells."
                }
                onRetry={() => monitoredWellsQuery.refetch()}
              />
            ) : (
              <FormControl
                size="small"
                sx={{ width: "100%" }}
                disabled={monitoredWellsQuery.isFetching}
              >
                <InputLabel id={`${uniqueSelectId}-label`}>Well</InputLabel>
                <Select
                  label="Well"
                  labelId={`${uniqueSelectId}-label`}
                  value={wellId ?? ""}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    navigate({
                      to: "/monitoringwells",
                      search: (prev) => ({
                        ...(prev as any),
                        wellId: next,
                      }),
                      replace: true,
                    });
                  }}
                >
                  {monitoredWellsQuery.isFetching && (
                    <MenuItem disabled>Loading...</MenuItem>
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
            )}
          </Box>
          <ResizableSplitPanels
            leftWidth={split}
            onLeftWidthChange={(nextSplit) => {
              const roundedSplit = Math.round(nextSplit);
              window.localStorage.setItem(
                MONITORING_WELLS_SPLIT_STORAGE_KEY,
                roundedSplit.toString(),
              );
              navigate({
                to: "/monitoringwells",
                search: (prev) => ({
                  ...(prev as any),
                  split: roundedSplit,
                }),
                replace: true,
              });
            }}
            left={
              <MonitoringWellsPlotSection
                manualMeasurements={manualMeasurements}
                st2Measurements={st2Measurements}
                johnsonSensorDataMeasurements={johnsonSensorDataMeasurements}
                isWellSelected={!!wellId}
                isLoading={
                  isLoadingManual || isLoadingSt2 || isLoadingJohnsonSensorData
                }
                loadingSources={plotLoadingSources}
                isError={
                  !!errorManual || !!errorSt2 || !!errorJohnsonSensorData
                }
                onRetry={() => {
                  refetchManual();
                  if (dataStreamId) {
                    queryClient.invalidateQueries({
                      queryKey: ["st2Measurements", dataStreamId],
                    });
                  }
                  if (wellId === 2599) {
                    queryClient.invalidateQueries({
                      queryKey: ["woodpeckers", wellId],
                    });
                  }
                }}
              />
            }
            right={
              <MonitoringWellsTableSection
                rows={manualMeasurements ?? []}
                selectedWell={monitoredWellsQuery?.data?.find(
                  (well) => well.id == wellId,
                )}
                isWellSelected={!!wellId}
                isError={!!errorManual}
                onRetry={() => refetchManual()}
                onOpenModal={() => setIsNewModalOpen(true)}
                onMeasurementSelect={handleMeasurementSelect}
              />
            }
          />
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
                  setSelectedMeasurement((prev) => ({ ...prev, ...update }))
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
}
