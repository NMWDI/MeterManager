import { useId, useState } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "react-query";
import { useAuthUser } from "react-auth-kit";
import { ChloridesTable } from "./ChloridesTable";
import { ChloridesPlot } from "./ChloridesPlot";
import {
  NewMeasurementModal,
  UpdateMeasurementModal,
} from "../../components/RegionMeasurementModals";
import {
  NewRegionMeasurement,
  PatchRegionMeasurement,
  SecurityScope,
  RegionMeasurementDTO,
} from "../../interfaces";
import dayjs, { Dayjs } from "dayjs";
import { useFetchWithAuth } from "../../hooks";
import { Science } from "@mui/icons-material";
import { BackgroundBox } from "../../components/BackgroundBox";
import { CustomCardHeader } from "../../components/CustomCardHeader";

export const ChloridesView = () => {
  const fetchWithAuth = useFetchWithAuth();
  const selectedRegionId = useId();
  const [regionId, setregionId] = useState<number>();
  const [selectedMeasurement, setSelectedMeasurement] =
    useState<PatchRegionMeasurement>({
      levelmeasurement_id: 0,
      timestamp: dayjs(),
      value: 0,
      submitting_user_id: 0,
      well_id: 0,
    });

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const authUser = useAuthUser();
  const isAdmin = authUser()?.user_role.security_scopes.some(
    (s: SecurityScope) => s.scope_string === "admin",
  );

  const {
    data: regions,
    isLoading: isLoadingRegions,
    error: errorRegions,
  } = useQuery<{ id: number; names: string[] }[], Error>({
    queryKey: ["regions"],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/chloride_groups",
        params: {
          sort_direction: "asc",
        },
      }),
  });

  const {
    data: manualMeasurements,
    isLoading: isLoadingManual,
    error: errorManual,
    refetch: refetchManual,
  } = useQuery<RegionMeasurementDTO[], Error>({
    queryKey: ["chlorides", regionId],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/chlorides",
        params: { chloride_group_id: regionId },
      }),
    enabled: !!regionId,
  });

  const milligramPerLiterUnitId = 14;
  const { mutateAsync: createChlorideLevel } = useMutation({
    mutationKey: ["regions", "creation"],
    mutationFn: (body: NewRegionMeasurement) =>
      fetchWithAuth({
        method: "POST",
        route: "/chlorides",
        body: {
          timestamp: body.timestamp,
          value: body.value,
          submitting_user_id: body.submitting_user_id,
          chloride_group_id: body.region_id,
          unit_id: milligramPerLiterUnitId,
          well_id: body.well_id,
        },
      }),
  });

  const { mutateAsync: updateChlorideLevel } = useMutation({
    mutationKey: ["regions", "modification"],
    mutationFn: (body: PatchRegionMeasurement) =>
      fetchWithAuth({
        method: "PATCH",
        route: "/chlorides",
        body: {
          id: body.levelmeasurement_id,
          timestamp: body.timestamp,
          value: body.value,
          submitting_user_id: body.submitting_user_id,
          chloride_group_id: regionId,
          unit_id: milligramPerLiterUnitId,
          well_id: body.well_id,
        },
      }),
  });

  const { mutateAsync: deleteChlorideLevel } = useMutation({
    mutationKey: ["regions", "deletion"],
    mutationFn: (levelmeasurement_id: number) =>
      fetchWithAuth({
        method: "DELETE",
        route: "/chlorides",
        params: { chloride_measurement_id: levelmeasurement_id },
      }),
  });

  const error = errorRegions || errorManual;

  const handleSubmitNewMeasurement = (data: NewRegionMeasurement) => {
    if (regionId) {
      data.region_id = regionId;
      createChlorideLevel(data, { onSuccess: () => refetchManual() });
    }
    setIsNewModalOpen(false);
  };

  const handleSubmitMeasurementUpdate = () => {
    updateChlorideLevel(selectedMeasurement, {
      onSuccess: () => refetchManual(),
    });
    setIsUpdateModalOpen(false);
  };

  const handleDeleteMeasurement = () => {
    setIsUpdateModalOpen(false);
    if (window.confirm("Are you sure you want to delete this measurement?")) {
      deleteChlorideLevel(selectedMeasurement.levelmeasurement_id, {
        onSuccess: () => refetchManual(),
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
      well: {
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
      well_id: rowdata.row.well.id,
    });
    setIsUpdateModalOpen(true);
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Chlorides" icon={Science} />
        <CardContent>
          {error && (
            <Typography variant="h4">
              An error had occurred while attempting to loading data
            </Typography>
          )}

          <FormControl
            sx={{ minWidth: "100px" }}
            disabled={isLoadingRegions || !!errorRegions}
          >
            <InputLabel id={`${selectedRegionId}-label`}>Region</InputLabel>
            <Select
              label="Region"
              sx={{ width: "600px" }}
              labelId={`${selectedRegionId}-label`}
              value={regionId ?? ""}
              onChange={(e) => setregionId(Number(e.target.value))}
            >
              {isLoadingRegions && <MenuItem disabled>Loading...</MenuItem>}
              {errorRegions && (
                <MenuItem disabled>Error loading Regions</MenuItem>
              )}
              {regions?.map((region) => (
                <MenuItem key={region.id} value={region.id}>
                  Region {region.id}
                  {region.names.length > 0 ? ":" : null}{" "}
                  {region.names.slice(0, 3).join(", ")}
                  {region.names.length > 3 ? "..." : ""}
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
              <ChloridesTable
                rows={manualMeasurements ?? []}
                isRegionSelected={!!regionId}
                onOpenModal={() => setIsNewModalOpen(true)}
                onMeasurementSelect={handleMeasurementSelect}
              />
            </Box>
            <Box sx={{ flex: { xs: 1, md: 2 / 3 }, minWidth: 0 }}>
              <ChloridesPlot
                isLoading={isLoadingManual}
                manual_dates={manualMeasurements?.map((m) => m.timestamp) ?? []}
                manual_vals={
                  manualMeasurements?.map((m) => ({
                    value: m.value,
                    well: m.well.ra_number,
                  })) ?? []
                }
              />
            </Box>
          </Box>

          <NewMeasurementModal
            region_id={regionId ?? 0}
            isNewMeasurementModalOpen={isNewModalOpen}
            handleCloseNewMeasurementModal={() => setIsNewModalOpen(false)}
            handleSubmitNewMeasurement={handleSubmitNewMeasurement}
          />

          <UpdateMeasurementModal
            region_id={regionId ?? 0}
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
