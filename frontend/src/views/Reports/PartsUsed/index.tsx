import { useEffect, useMemo, useRef } from "react";
import { useAuthHeader } from "react-auth-kit";
import { BuildOutlined, PictureAsPdf } from "@mui/icons-material";
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";

import { API_URL } from "@/config";
import {
  ControlledDatepicker,
  BackgroundBox,
  CustomCardHeader,
  ControlledSelect,
  ReportBreadcrumbTitle,
} from "@/components";
import { Route } from "@/routes/reports/partsused";

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
    .test("is-after", "'To' date must be after 'From'", function (value) {
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
  in_use: yup.bool().required(),
});

const defaultSchema = {
  from: dayjs().startOf("month"),
  to: dayjs().endOf("month"),
  part_types: [],
  parts: [],
  in_use: true,
};

export const PartsUsedReportView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const hydratedRef = useRef(false);

  const defaultValues = useMemo(
    () => ({
      from: dayjs(search.from, "YYYY-MM-DD"),
      to: dayjs(search.to, "YYYY-MM-DD"),
      part_types: [],
      parts: [],
      in_use: search.in_use,
    }),
    [search.from, search.to, search.in_use],
  );

  const { control, reset, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    hydratedRef.current = false;
    reset(defaultValues);
  }, [defaultValues, reset]);

  const from = watch("from");
  const to = watch("to");
  const selectedPartIds = watch("parts") ?? [];
  const partTypes = watch("part_types");
  const inUse = watch("in_use");

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/reports/partsused",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

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

  const partTypeOptions = useMemo(
    () => [
      ...new Map(
        (partsQuery?.data ?? [])
          .map((option: Part) => ({
            id: option.part_type_id,
            type: option.part_type,
          }))
          .map((item) => [item.id, item]),
      ).values(),
    ],
    [partsQuery.data],
  );

  useEffect(() => {
    setValue("from", dayjs(search.from, "YYYY-MM-DD"), {
      shouldDirty: false,
      shouldValidate: true,
    });
    setValue("to", dayjs(search.to, "YYYY-MM-DD"), {
      shouldDirty: false,
      shouldValidate: true,
    });
    setValue("in_use", search.in_use, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [search.from, search.to, search.in_use, setValue]);

  useEffect(() => {
    if (!partsQuery.data) return;

    const selected = partTypeOptions.filter((option) =>
      search.part_types.includes(option.id),
    );
    setValue("part_types", selected, {
      shouldDirty: false,
      shouldValidate: true,
    });

    const availablePartIds = new Set(partsQuery.data.map((part) => part.id));
    const selectedParts = search.parts.filter((id) => availablePartIds.has(id));

    setValue("parts", selectedParts, {
      shouldDirty: false,
      shouldValidate: true,
    });

    hydratedRef.current = true;
  }, [
    partTypeOptions,
    partsQuery.data,
    search.part_types,
    search.parts,
    setValue,
  ]);

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

  const groupedFilteredParts = useMemo(() => {
    return [...filteredParts].sort((a, b) => {
      const typeCompare = (a.part_type?.name ?? "").localeCompare(
        b.part_type?.name ?? "",
      );
      if (typeCompare !== 0) return typeCompare;

      return `${a.part_number} ${a.description}`.localeCompare(
        `${b.part_number} ${b.description}`,
      );
    });
  }, [filteredParts]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const validIds = filteredParts.map((p) => p.id);
    const stillValid = selectedPartIds.filter((id) => validIds.includes(id));

    if (selectedPartIds.length !== stillValid.length) {
      setValue("parts", stillValid, {
        shouldDirty: false,
        shouldValidate: true,
      });
      setSearch((prev) => ({
        ...prev,
        parts: stillValid,
        page: 0,
      }));
    }
  }, [filteredParts, selectedPartIds, setSearch, setValue]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const nextFrom = from?.format("YYYY-MM-DD");
    const nextTo = to?.format("YYYY-MM-DD");
    const nextPartTypes = (partTypes ?? []).map((partType: any) => partType.id);

    setSearch((prev) => {
      const sameFrom = prev.from === nextFrom;
      const sameTo = prev.to === nextTo;
      const sameInUse = prev.in_use === inUse;
      const samePartTypes =
        prev.part_types.length === nextPartTypes.length &&
        prev.part_types.every((value, index) => value === nextPartTypes[index]);
      const sameParts =
        prev.parts.length === selectedPartIds.length &&
        prev.parts.every((value, index) => value === selectedPartIds[index]);

      if (sameFrom && sameTo && sameInUse && samePartTypes && sameParts) {
        return prev;
      }

      return {
        ...prev,
        from: nextFrom,
        to: nextTo,
        part_types: nextPartTypes,
        parts: selectedPartIds,
        in_use: inUse,
        page: 0,
      };
    });
  }, [from, to, partTypes, selectedPartIds, inUse]);

  const partsUsedQuery = useQuery<any[]>({
    queryKey: ["Inventory", "report", "partsused", from, to, selectedPartIds],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
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
        from_date: from.format("YYYY-MM-DD"),
        to_date: to.format("YYYY-MM-DD"),
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
        <CustomCardHeader
          title={<ReportBreadcrumbTitle current="Parts Used" />}
          icon={BuildOutlined}
        />
        <CardContent>
          <Grid
            container
            justifyContent="flex-start"
            alignContent="center"
            spacing={2}
            padding={2}
          >
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                sx={{ width: "100%" }}
                size="small"
                label="From"
                control={control}
                name="from"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                sx={{ width: "100%" }}
                size="small"
                label="To"
                control={control}
                name="to"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs sx={{ flexGrow: 1 }}>
              {partsQuery.isLoading ? (
                <Skeleton variant="rounded" width="100%" height={40} />
              ) : (
                <ControlledSelect
                  sx={{ width: "100%" }}
                  size="small"
                  label="Part Types"
                  control={control}
                  name="part_types"
                  multiple
                  disabled={partsQuery.isFetching}
                  options={partTypeOptions}
                  getOptionLabel={(option: any) => option.type.name}
                />
              )}
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
              md="auto"
              sx={{
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <Tooltip title="Export report as PDF" placement="top">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdf />}
                    aria-label="export report as pdf"
                    onClick={handleDownloadPDF}
                    disabled={
                      !selectedPartIds.length || downloadPDFMutation.isLoading
                    }
                    sx={{ width: "fit-content", whiteSpace: "nowrap" }}
                  >
                    PDF
                  </Button>
                </span>
              </Tooltip>
            </Grid>
            <Grid item xs={12}>
              {partsQuery.isLoading ? (
                <Skeleton variant="rounded" width="100%" height={40} />
              ) : (
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
                        options={groupedFilteredParts}
                        groupBy={(option: Part) =>
                          option.part_type?.name ?? "Other"
                        }
                        getOptionLabel={(option: Part) =>
                          `${option.part_number} ${option.description}`
                        }
                        isOptionEqualToValue={(a: Part, b: Part) =>
                          a.id === b.id
                        }
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
                            size="small"
                            sx={{ width: "100%" }}
                            label="Parts"
                            placeholder="Begin typing to search"
                          />
                        )}
                      />
                    );
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12} sx={{ display: "flex", alignItems: "center" }}>
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
          <Grid item xs={12} padding={2}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableColumnMenu
              hideFooterSelectedRowCount
              pagination
              pageSizeOptions={[5, 10, 25]}
              paginationModel={{ page: search.page, pageSize: search.pageSize }}
              onPaginationModelChange={(model) =>
                setSearch((prev) => ({
                  ...prev,
                  pageSize: model.pageSize,
                  page: model.pageSize !== prev.pageSize ? 0 : model.page,
                }))
              }
            />
          </Grid>
          <Grid item xs={12} px={2}>
            <Button
              onClick={() => {
                reset(defaultSchema);
                setSearch((prev) => ({
                  ...prev,
                  from: dayjs().startOf("month").format("YYYY-MM-DD"),
                  to: dayjs().endOf("month").format("YYYY-MM-DD"),
                  part_types: [],
                  parts: [],
                  in_use: true,
                  page: 0,
                  pageSize: 5,
                }));
              }}
            >
              Reset
            </Button>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
