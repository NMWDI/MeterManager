import { useEffect, useMemo } from "react";
import { ArrowBack, Build, PictureAsPdf } from "@mui/icons-material";
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  TextField,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import { API_URL } from "../../../config";
import { useAuthHeader } from "react-auth-kit";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { BackgroundBox } from "../../../components/BackgroundBox";
import { CustomCardHeader } from "../../../components/CustomCardHeader";
import { ControlledSelect } from "../../../components/RHControlled/ControlledSelect";

export interface MeterType {
  id: number;
  brand: string;
  series: string | null;
  model: string;
  size: number;
  description: string;
  in_use: boolean;
}

export interface PartType {
  id: number;
  name: string;
  description: string;
}

export interface Part {
  id: number;
  part_number: string;
  description: string;
  vendor: string | null;
  count: number;
  note: string;
  in_use: boolean;
  commonly_used: boolean;
  price: number | null;
  part_type_id: number;
  part_type: PartType;
  meter_types: MeterType[];
}

const schema = yup.object().shape({
  from: yup.mixed<Dayjs>().nullable().required("From date is required"),
  to: yup
    .mixed<Dayjs>()
    .nullable()
    .required("To date is required")
    .test("is-after", "'To' date must be after 'From'", function(value) {
      const { from } = this.parent;
      return !from || !value || dayjs(value).isAfter(dayjs(from));
    }),
  part_types: yup
    .array()
    .of(
      yup.object().shape({
        id: yup.number().nullable(),
        type: yup
          .object()
          .shape({
            id: yup.number().nullable(),
            name: yup.string().nullable(),
            description: yup.string().nullable(),
          })
          .nullable(),
      }),
    )
    .nullable(),
  parts: yup
    .array()
    .of(yup.number().required())
    .min(1, "At least one Part is required"),
  in_use: yup.bool().required()
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
  part_types: [],
  parts: [],
  in_use: true
};

export const PartsUsedReportView = () => {
  const { control, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");
  const selectedPartIds = watch("parts") ?? [];
  const partTypes = watch("part_types");
  const inUse = watch("in_use");

  const authHeader = useAuthHeader();
  const partsQuery = useQuery<Part[]>({
    queryKey: ["Inventory", "report", "partslist", inUse],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/parts?in_use=${inUse}`, {
        headers: { Authorization: authHeader() },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch parts");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24, // cache in memory for 24 hours
  });

  const filteredParts = useMemo(() => {
    if (!partsQuery.data) return [];

    if (Array.isArray(partTypes) && partTypes.length > 0) {
      const selectedIds = partTypes.map((pt) => pt.id);
      return partsQuery.data.filter((p) =>
        selectedIds.includes(p.part_type_id),
      );
    }

    return partsQuery.data;
  }, [partsQuery.data, partTypes]);

  useEffect(() => {
    const currentParts = watch("parts") ?? [];
    const validIds = filteredParts.map((p) => p.id);
    const stillValid = currentParts.filter((id) => validIds.includes(id));

    if (currentParts.length !== stillValid.length) {
      // Drop invalid part IDs
      reset({ ...watch(), parts: stillValid });
    }
  }, [partTypes, filteredParts]);

  const partsUsedQuery = useQuery<any[]>({
    queryKey: ["Inventory", "report", "partsused", from, to, selectedPartIds],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        from_month: from?.format("YYYY-MM"),
        to_month: to?.format("YYYY-MM"),
      });

      selectedPartIds.forEach((id: number) => {
        searchParams.append("parts", id.toString());
      });

      const response = await fetch(
        `${API_URL}/parts/used?${searchParams.toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch parts used data");
      }

      return response.json();
    },
    enabled: Boolean(from && to && selectedPartIds?.length > 0),
  });

  let runningTotal = 0;

  const rows = partsUsedQuery?.data?.map((part) => {
    runningTotal += part.total;
    return {
      ...part,
      running_total: runningTotal,
    };
  });

  const columns: GridColDef[] = [
    { field: "part_number", headerName: "Part", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
    {
      field: "price",
      headerName: "Cost per unit",
      flex: 1,
      valueFormatter: (param: number) =>
        typeof param === "number" ? `$${param?.toFixed(2)}` : "$0.00",
    },
    {
      field: "quantity",
      headerName: "Number of units",
      flex: 1,
      type: "number",
    },
    {
      field: "total",
      headerName: "Total cost",
      flex: 1,
      valueFormatter: (param: number) =>
        typeof param === "number" ? `$${param?.toFixed(2)}` : "$0.00",
    },
    {
      field: "running_total",
      headerName: "Running Total",
      flex: 1,
      valueFormatter: (param: number) =>
        typeof param === "number" ? `$${param.toFixed(2)}` : "$0.00",
    },
  ];

  const downloadPDFMutation = useMutation({
    mutationFn: async ({
      from,
      to,
      parts,
    }: {
      from: Dayjs;
      to: Dayjs;
      parts: number[];
    }) => {
      const params = new URLSearchParams({
        from_month: from.format("YYYY-MM"),
        to_month: to.format("YYYY-MM"),
      });

      parts.forEach((id) => params.append("parts", id.toString()));

      const response = await fetch(
        `${API_URL}/parts/used/pdf?${params.toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "parts_used_report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleDownloadPDF = () => {
    if (!from || !to || selectedPartIds.length === 0) return;

    downloadPDFMutation.mutate({
      from,
      to,
      parts: selectedPartIds,
    });
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Parts Used Report" icon={Build} />
        <CardContent>
          <Grid
            container
            justifyContent="space-between"
            alignContent="center"
            paddingBottom={2}
          >
            <Grid item>
              <Link to="/reports">
                <Tooltip title="Go back" placement="right">
                  <IconButton aria-label="return to reports page">
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Link>
            </Grid>
            <Grid item>
              <Tooltip title="Export report as PDF" placement="left">
                <IconButton
                  aria-label="export report as pdf"
                  onClick={handleDownloadPDF}
                  disabled={
                    !selectedPartIds.length || downloadPDFMutation.isLoading
                  }
                >
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          <Grid
            container
            justifyContent="flex-start"
            alignContent="center"
            gap={2}
            padding={2}
          >
            <Grid item>
              <ControlledDatepicker
                label="From"
                sx={{ minWidth: "15rem" }}
                control={control}
                size="medium"
                name="from"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledDatepicker
                label="To"
                sx={{ minWidth: "15rem" }}
                control={control}
                size="medium"
                name="to"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledSelect
                label="Part Types"
                control={control}
                sx={{ minWidth: "15rem" }}
                size="medium"
                name="part_types"
                multiple
                disabled={partsQuery.isFetching}
                options={[
                  ...new Map(
                    partsQuery?.data
                      ?.map((option: Part) => ({
                        id: option.part_type_id,
                        type: option.part_type,
                      }))
                      .map((item) => [item.id, item]), // key by id
                  ).values(),
                ]}
                getOptionLabel={(option: any) => option.type.name}
              />
            </Grid>
            <Grid item>
              <Controller
                name="parts"
                control={control}
                render={({ field }) => {
                  // Convert stored IDs to Part objects for the `value` prop
                  const selectedParts = (partsQuery?.data ?? []).filter(
                    (part) => field?.value?.includes(part.id),
                  );

                  return (
                    <Autocomplete
                      multiple
                      disableClearable
                      options={filteredParts}
                      getOptionLabel={(option: Part) =>
                        `${option.part_number} ${option.description}`
                      }
                      isOptionEqualToValue={(a: Part, b: Part) => a.id === b.id}
                      value={selectedParts}
                      onChange={(_, selectedOptions) =>
                        field.onChange(selectedOptions.map((p) => p.id))
                      }
                      filterOptions={(options: Part[], state: any) =>
                        options.filter((opt) =>
                          `${opt.part_number} ${opt.description}`
                            .toLowerCase()
                            .includes(state.inputValue.toLowerCase()),
                        )
                      }
                      loading={partsQuery.isLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="medium"
                          sx={{ minWidth: "30rem" }}
                          label="Parts"
                          placeholder="Begin typing to search"
                        />
                      )}
                    />
                  );
                }}
              />
            </Grid>
            <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller
                name="in_use"
                control={control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <FormControlLabel
                      label="In Use Parts Only"
                      control={
                        <Switch
                          checked={!!value}
                          onChange={(e) => onChange(e.target.checked)}
                        />
                      }
                    />
                  );
                }}
              />
            </Grid>
          </Grid>
          <Grid container padding={2}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableColumnMenu
              hideFooterSelectedRowCount
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 5, page: 0 },
                },
              }}
            />
          </Grid>
          <Grid container padding={2}>
            <Grid item>
              <Button onClick={() => reset(defaultSchema)}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
