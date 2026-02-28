import { useId, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Card,
  CardContent,
  Alert,
  Button,
  AlertTitle,
  Grid,
} from "@mui/material";
import { Science } from "@mui/icons-material";
import { useMutation, useQuery } from "react-query";
import { useAuthUser } from "react-auth-kit";
import { useSnackbar } from "notistack";
import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import { CreateModal, UpdateModal } from "@/components/Modals/Region";
import {
  NewRegionMeasurement,
  PatchRegionMeasurement,
  SecurityScope,
  RegionMeasurementDTO,
} from "@/interfaces";
import { useFetchWithAuth } from "@/hooks";
import { BackgroundBox, CustomCardHeader } from "@/components";
import { emptyToNull } from "@/utils";
import { Table, Plot } from "@/views/Chlorides";

export const Route = createFileRoute("/chlorides")({
  validateSearch: z.object({
    regionId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(0).catch(0),
    pageSize: z.coerce.number().int().min(10).max(200).catch(25),
  }),
  component: Chlorides,
});

function Chlorides() {
  const navigate = useNavigate();
  const { regionId } = Route.useSearch();
  const { enqueueSnackbar } = useSnackbar();
  const fetchWithAuth = useFetchWithAuth();
  const uniqueSelectId = useId();
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

  const regionsQuery = useQuery<{ id: number; names: string[] }[], Error>({
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

  const manualQuery = useQuery<RegionMeasurementDTO[], Error>({
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
    mutationFn: (body: Partial<NewRegionMeasurement>) =>
      fetchWithAuth({
        method: "POST",
        route: "/chlorides",
        body: {
          timestamp: body.timestamp,
          value: emptyToNull(body.value),
          submitting_user_id: body.submitting_user_id,
          chloride_group_id: body.region_id,
          unit_id: milligramPerLiterUnitId,
          well_id: body.well_id,
        },
      }),
    onSuccess: () => {
      enqueueSnackbar("Chloride measurement created successfully", {
        variant: "success",
      });
    },
    onError: (err: any) => {
      enqueueSnackbar(
        `Failed to create chloride measurement: ${err.message ?? "Unknown error"}`,
        {
          variant: "error",
        },
      );
    },
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
          value: emptyToNull(body.value),
          submitting_user_id: body.submitting_user_id,
          chloride_group_id: regionId,
          unit_id: milligramPerLiterUnitId,
          well_id: body.well_id,
        },
      }),
    onSuccess: () => {
      enqueueSnackbar("Chloride measurement updated successfully", {
        variant: "success",
      });
    },
    onError: (err: any) => {
      enqueueSnackbar(
        `Failed to update chloride measurement: ${err.message ?? "Unknown error"}`,
        {
          variant: "error",
        },
      );
    },
  });

  const { mutateAsync: deleteChlorideLevel } = useMutation({
    mutationKey: ["regions", "deletion"],
    mutationFn: (levelmeasurement_id: number) =>
      fetchWithAuth({
        method: "DELETE",
        route: "/chlorides",
        params: { chloride_measurement_id: levelmeasurement_id },
      }),
    onSuccess: () => {
      enqueueSnackbar("Chloride measurement deleted successfully", {
        variant: "success",
      });
    },
    onError: (err: any) => {
      enqueueSnackbar(
        `Failed to delete chloride measurement: ${err.message ?? "Unknown error"}`,
        {
          variant: "error",
        },
      );
    },
  });

  const error = regionsQuery.isError || manualQuery.isError;

  const handleSubmitNewMeasurement = (data: Partial<NewRegionMeasurement>) => {
    if (regionId) {
      data.region_id = regionId;
      createChlorideLevel(data, { onSuccess: () => manualQuery.refetch() });
    }
    setIsNewModalOpen(false);
  };

  const handleSubmitMeasurementUpdate = () => {
    updateChlorideLevel(selectedMeasurement, {
      onSuccess: () => manualQuery.refetch(),
    });
    setIsUpdateModalOpen(false);
  };

  const handleDeleteMeasurement = () => {
    setIsUpdateModalOpen(false);
    if (window.confirm("Are you sure you want to delete this measurement?")) {
      deleteChlorideLevel(selectedMeasurement.levelmeasurement_id, {
        onSuccess: () => manualQuery.refetch(),
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
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={() => regionsQuery.refetch()}
                >
                  Retry
                </Button>
              }
            >
              <AlertTitle>Error Loading Data</AlertTitle>
              We couldn’t load chloride data. Please check your connection or
              try again.
            </Alert>
          )}
          <FormControl
            size="small"
            sx={{ minWidth: "100px", maxWidth: 600, width: "100%" }}
            disabled={regionsQuery.isLoading || !!regionsQuery.isError}
          >
            <InputLabel id={`${uniqueSelectId}-label`}>Region</InputLabel>
            <Select
              label="Region"
              labelId={`${uniqueSelectId}-label`}
              value={regionId ?? ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                navigate({
                  to: "/chlorides",
                  search: { regionId: next },
                  replace: true,
                });
              }}
            >
              {regionsQuery.isLoading && (
                <MenuItem disabled>Loading...</MenuItem>
              )}
              {regionsQuery.isLoading && (
                <MenuItem disabled>Error loading Regions</MenuItem>
              )}
              {regionsQuery?.data?.map((region) => (
                <MenuItem key={region.id} value={region.id}>
                  Region {region.id}
                  {region.names.length > 0 ? ":" : null}{" "}
                  {region.names.slice(0, 3).join(", ")}
                  {region.names.length > 3 ? "..." : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid container spacing={2} sx={{ mt: "1rem" }}>
            <Grid item xs={12} lg={7}>
              <Plot
                isLoading={manualQuery.isLoading}
                manual_dates={manualQuery?.data?.map((m) => m.timestamp) ?? []}
                manual_vals={
                  manualQuery?.data?.map((m) => ({
                    value: m.value,
                    well: m.well.ra_number,
                  })) ?? []
                }
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <Table
                rows={manualQuery?.data ?? []}
                isRegionSelected={!!regionId}
                onOpenModal={() => setIsNewModalOpen(true)}
                onMeasurementSelect={handleMeasurementSelect}
              />
            </Grid>
          </Grid>
          {authUser() && (
            <>
              <CreateModal
                region_id={regionId ?? 0}
                open={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                handleSubmitNewMeasurement={handleSubmitNewMeasurement}
              />
              <UpdateModal
                region_id={regionId ?? 0}
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
}
