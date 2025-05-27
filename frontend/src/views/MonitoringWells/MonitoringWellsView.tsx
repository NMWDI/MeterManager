import { useId, useState, useMemo } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  Typography,
  ListSubheader,
  useTheme,
} from "@mui/material";
import { useQuery } from "react-query";
import { useAuthUser } from "react-auth-kit";
import { MonitoringWellsTable } from "./MonitoringWellsTable";
import { MonitoringWellsPlot } from "./MonitoringWellsPlot";
import {
  NewMeasurementModal,
  UpdateMeasurementModal,
} from "../../components/WellMeasurementModals";
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

const separateAndSortWells = (
  wells: MonitoredWell[] = [],
): [MonitoredWell[], MonitoredWell[]] => {
  const sortWells = (w: MonitoredWell[]) =>
    w.slice().sort((a, b) => {
      if (!a.name) return 1; // Move undefined/null names to the bottom
      if (!b.name) return -1;
      return a.name.localeCompare(b.name);
    });

  const outsideRecorderWells = sortWells(
    wells.filter((well) => well.outside_recorder === true),
  );
  const regularWells = sortWells(
    wells.filter((well) => well.outside_recorder !== true),
  );

  return [outsideRecorderWells, regularWells];
};

export const MonitoringWellsView = () => {
  const theme = useTheme();

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

  const {
    data: wells,
    isLoading: isLoadingWells,
    error: errorWells,
  } = useQuery<{ items: MonitoredWell[] }, Error, MonitoredWell[]>({
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
        params: { well_id: wellId },
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

  const createMeasurement = useCreateWaterLevel();
  const updateMeasurement = useUpdateWaterLevel(() => refetchManual());
  const deleteMeasurement = useDeleteWaterLevel();

  const error = errorWells || errorManual || errorSt2;

  const handleSubmitNewMeasurement = (data: NewWellMeasurement) => {
    if (wellId) {
      data.well_id = wellId;
      createMeasurement.mutate(data, { onSuccess: () => refetchManual() });
    }
    setIsNewModalOpen(false);
  };

  const handleSubmitMeasurementUpdate = () => {
    updateMeasurement.mutate(selectedMeasurement);
    setIsUpdateModalOpen(false);
  };

  const handleDeleteMeasurement = () => {
    setIsUpdateModalOpen(false);
    if (window.confirm("Are you sure you want to delete this measurement?")) {
      deleteMeasurement.mutate(selectedMeasurement.levelmeasurement_id);
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

  const [outsideRecorderWells, regularWells] = separateAndSortWells(wells);

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Monitored Well Values" icon={MonitorHeart} />
        <CardContent>
          {error && (
            <Typography variant="h4">
              An error had occurred while attempting to loading data
            </Typography>
          )}

          <FormControl
            sx={{ minWidth: "100px" }}
            disabled={isLoadingWells || !!errorWells}
          >
            <InputLabel id={`${selectWellId}-label`}>Site</InputLabel>
            <Select
              label="Site"
              sx={{ width: "100%", maxWidth: "600px" }}
              labelId={`${selectWellId}-label`}
              value={wellId ?? ""}
              onChange={(e) => setWellId(Number(e.target.value))}
            >
              {isLoadingWells && <MenuItem disabled>Loading...</MenuItem>}
              {errorWells && <MenuItem disabled>Error loading wells</MenuItem>}
              {regularWells.length > 0 ? (
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

          <Box
            sx={{
              mt: "1rem",
              gap: "1rem",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              width: "100%",
              height: 600,
            }}
          >
            <Box sx={{ flex: { xs: 1, md: 1 / 3 }, minWidth: 0 }}>
              <MonitoringWellsTable
                rows={manualMeasurements ?? []}
                selectedWell={wells?.find((well) => well.id == wellId)}
                isWellSelected={!!wellId}
                onOpenModal={() => setIsNewModalOpen(true)}
                onMeasurementSelect={handleMeasurementSelect}
              />
            </Box>
            <Box sx={{ flex: { xs: 1, md: 2 / 3 }, minWidth: 0 }}>
              <MonitoringWellsPlot
                isLoading={isLoadingManual || isLoadingSt2}
                manual_dates={manualMeasurements?.map((m) => m.timestamp) ?? []}
                manual_vals={manualMeasurements?.map((m) => m.value) ?? []}
                logger_dates={st2Measurements?.map((m) => m.resultTime) ?? []}
                logger_vals={st2Measurements?.map((m) => m.result) ?? []}
              />
            </Box>
          </Box>

          <NewMeasurementModal
            isNewMeasurementModalOpen={isNewModalOpen}
            handleCloseNewMeasurementModal={() => setIsNewModalOpen(false)}
            handleSubmitNewMeasurement={handleSubmitNewMeasurement}
          />

          <UpdateMeasurementModal
            isMeasurementModalOpen={isUpdateModalOpen}
            handleCloseMeasurementModal={() => setIsUpdateModalOpen(false)}
            measurement={selectedMeasurement}
            onUpdateMeasurement={(update) =>
              setSelectedMeasurement({ ...selectedMeasurement, ...update })
            }
            onSubmitUpdate={handleSubmitMeasurementUpdate}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
