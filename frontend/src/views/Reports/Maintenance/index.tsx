import { useEffect, useMemo, useRef } from "react";
import { useAuthHeader } from "react-auth-kit";
import { ArrowBack, PictureAsPdf, Plumbing } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Route } from "@/routes/reports/maintenance";
import dayjs, { Dayjs } from "dayjs";
import { PieChart } from "@mui/x-charts";
import {
  DataGrid,
  GridColDef,
  GridValueGetter,
  GridValueFormatter,
} from "@mui/x-data-grid";
import {
  ControlledDatepicker,
  ControlledAutocomplete,
  BackgroundBox,
  ControlledTextbox,
  CustomCardHeader,
} from "@/components";
import { API_URL, ROLE_IDS } from "@/config";
import { User } from "@/interfaces";
import {
  getRoleLabel,
  sortUsersByRoleThenName,
} from "@/utils/UserRoleGrouping";

type FormValues = {
  from: Dayjs;
  to: Dayjs;
  techicians: User[]; // keep your existing form name
  trss: string;
};

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
  techicians: yup
    .array()
    .of(
      yup.object({
        id: yup.number().required(),
        full_name: yup.string().required(),
      }),
    )
    .min(1, "At least one technician is required"),
  trss: yup.string().required("At least one Location is required"),
});

const defaultSchema = {
  from: dayjs().startOf("month"),
  to: dayjs().endOf("month"),
  techicians: [],
  trss: "",
};

const isoToDayjs = (s?: string, fallback?: Dayjs) =>
  s ? dayjs(s, "YYYY-MM-DD") : (fallback ?? dayjs());

export const MaintenanceReportView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const authHeader = useAuthHeader();

  const hydratedRef = useRef(false);

  const techiciansQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: authHeader() },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24, // cache in memory for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const technicianOptions = useMemo<User[]>(() => {
    const users = (techiciansQuery.data ?? []) as User[];
    return sortUsersByRoleThenName(users);
  }, [techiciansQuery.data]);

  // URL -> RHF default values (technicians are hydrated after users load)
  const defaultValues = useMemo<FormValues>(() => {
    const fallbackFrom = dayjs().startOf("month");
    const fallbackTo = dayjs().endOf("month");

    return {
      from: isoToDayjs(search.from, fallbackFrom),
      to: isoToDayjs(search.to, fallbackTo),
      techicians: [], // hydrate from search.technicians once we have users
      trss: search.trss ?? "",
    };
  }, [search.from, search.to, search.trss]);

  const { control, reset, setValue, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  // keep form in sync if URL changes (back/forward)
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // hydrate selected techs from URL ids AFTER users load
  useEffect(() => {
    const users = techiciansQuery.data;
    if (!users) return;

    const ids = new Set(search.technicians ?? []);
    let selected = users.filter((u: User) => ids.has(u.id));

    // if no ids provided, default to "all techs"
    if (selected.length === 0)
      selected = users?.filter(
        (u: User) => u?.user_role_id === ROLE_IDS.TECHNICIAN,
      );

    setValue("techicians", selected, {
      shouldDirty: false,
      shouldValidate: true,
    });

    hydratedRef.current = true;
  }, [techiciansQuery.data, search.technicians, setValue]);

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/reports/maintenance",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const from = watch("from");
  const to = watch("to");
  const technicians = watch("techicians");
  const trss = watch("trss");

  // push form -> URL (but only after hydration so we don't wipe URL on refresh)
  useEffect(() => {
    if (!hydratedRef.current) return;

    setSearch((prev) => ({
      ...(prev as any),
      from: from?.format("YYYY-MM-DD"),
      to: to?.format("YYYY-MM-DD"),
      trss: trss?.trim() || undefined,
      technicians: (technicians ?? []).map((t) => t.id),
      page: 0, // reset paging on filter changes
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    from?.valueOf(),
    to?.valueOf(),
    trss,
    (technicians ?? []).map((t) => t.id).join(","),
  ]);

  const dataQuery = useQuery({
    queryKey: [
      "maintenance",
      {
        from: search.from,
        to: search.to,
        trss: search.trss ?? "",
        technicians: search.technicians ?? [],
        offset: search.page * search.pageSize,
        limit: search.pageSize,
      },
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set(
        "from_date",
        search.from ?? dayjs().startOf("month").format("YYYY-MM-DD"),
      );
      queryParams.set(
        "to_date",
        search.to ?? dayjs().endOf("month").format("YYYY-MM-DD"),
      );
      queryParams.set("trss", search.trss ?? "");

      (search.technicians ?? []).forEach((id) =>
        queryParams.append("technicians", id.toString()),
      );

      // if your API supports pagination:
      queryParams.set("offset", String(search.page * search.pageSize));
      queryParams.set("limit", String(search.pageSize));

      const response = await fetch(
        `${API_URL}/maintenance?${queryParams.toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch maintenance data");
      return response.json();
    },
    enabled: Boolean(
      search.from && search.to && (search.technicians?.length ?? 0) > 0,
    ),
    keepPreviousData: true,
  });

  const numberOfRepairsPieChartData = useMemo(() => {
    return (
      dataQuery.data?.repairs_by_meter?.map((item: any) => ({
        label: item.meter,
        value: item.count,
      })) ?? []
    );
  }, [dataQuery.data]);

  const numberOfPMsPieChartData = useMemo(() => {
    return (
      dataQuery.data?.pms_by_meter?.map((item: any) => ({
        label: item.meter,
        value: item.count,
      })) ?? []
    );
  }, [dataQuery.data]);

  const totalRepairs = useMemo(() => {
    return (
      dataQuery.data?.repairs_by_meter?.reduce(
        (sum: number, item: any) => sum + (item.count ?? 0),
        0,
      ) ?? 0
    );
  }, [dataQuery.data]);

  const totalPMs = useMemo(() => {
    return (
      dataQuery.data?.pms_by_meter?.reduce(
        (sum: number, item: any) => sum + (item.count ?? 0),
        0,
      ) ?? 0
    );
  }, [dataQuery.data]);

  const tableRows = useMemo(() => {
    return (
      dataQuery.data?.table_rows?.map((row: any, index: number) => ({
        id: index,
        ...row,
      })) ?? []
    );
  }, [dataQuery.data]);

  const columns: GridColDef[] = [
    {
      field: "date_time",
      headerName: "Date / Time",
      type: "dateTime",
      flex: 1,
      valueGetter: ((value: any) => {
        return value ? new Date(value as string) : new Date();
      }) as GridValueGetter<Date>,
      valueFormatter: ((value) => {
        if (!value) return "";
        const date = value as Date;
        return date.toLocaleString();
      }) as GridValueFormatter,
    },
    { field: "technician", headerName: "Technician", flex: 1 },
    {
      field: "number_of_repairs",
      headerName: "Number of Repairs",
      type: "number",
      flex: 1,
    },
    {
      field: "number_of_pms",
      headerName: "Number of Preventative Maintenances",
      type: "number",
      flex: 1,
    },
    {
      field: "meter",
      headerName: "Meter",
      flex: 1,
    },
    {
      field: "trss",
      headerName: "TRSS",
      flex: 1,
    },
  ];

  const downloadMaintenancePDFMutation = useMutation({
    mutationFn: async ({
      from,
      to,
      technicians,
    }: {
      from: Dayjs;
      to: Dayjs;
      technicians: number[];
    }) => {
      const params = new URLSearchParams({
        from_date: from.format("YYYY-MM-DD"),
        to_date: to.format("YYYY-MM-DD"),
        trss: trss ?? "",
      });

      technicians.forEach((id) => params.append("technicians", id.toString()));

      const response = await fetch(
        `${API_URL}/maintenance/pdf?${params.toString()}`,
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
      a.download = "maintenance_summary.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleDownloadMaintenancePDF = () => {
    if (!from || !to || !technicians?.length) return;

    downloadMaintenancePDFMutation.mutate({
      from,
      to,
      technicians: technicians?.map((t) => t.id),
    });
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Maintenance Report" icon={Plumbing} />
        <CardContent>
          <Grid container justifyContent="space-between" alignContent="center">
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
                  onClick={handleDownloadMaintenancePDF}
                  disabled={
                    !technicians?.length ||
                    downloadMaintenancePDFMutation.isLoading
                  }
                >
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          <Grid container spacing={2} padding={2}>
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
            <Grid item xs={12} md={6}>
              <ControlledTextbox
                sx={{ width: "100%" }}
                size="small"
                name="trss"
                label="TRSS"
                control={control}
              />
            </Grid>
            <Grid item xs={12}>
              <ControlledAutocomplete
                name="techicians"
                multiple
                options={technicianOptions}
                control={control}
                disableClearable={false}
                defaultValue={[]}
                getOptionLabel={(option: User) => option?.full_name ?? ""}
                isOptionEqualToValue={(option: User, value: User) =>
                  option?.id === value?.id
                }
                onChange={(_: React.SyntheticEvent, selected: User[]) => {
                  setValue("techicians", selected, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });

                  if (hydratedRef.current) {
                    setSearch((prev) => ({
                      ...(prev as any),
                      technicians: selected.map((t) => t.id),
                      page: 0,
                    }));
                  }
                }}
                groupBy={(option: User) => getRoleLabel(option)}
                renderInput={(params: Parameters<typeof TextField>[0]) => {
                  if (techiciansQuery.isLoading && params.inputProps) {
                    params.inputProps.value = "Loading...";
                  }
                  return (
                    <TextField
                      {...params}
                      label="Technician(s)"
                      sx={{ minWidth: "15rem" }}
                      size="small"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
                renderTags={(selected: User[], getTagProps: any) =>
                  selected.map((option, index) => (
                    <Chip
                      key={option.id}
                      label={option.full_name}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} padding={2}>
            <Grid
              item
              xs={12}
              md={6}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 550,
                  height: "100%",
                  minHeight: 400,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h5" align="center">
                  Number of Repairs{dataQuery.data ? `: ${totalRepairs}` : ""}
                </Typography>
                <PieChart
                  series={[
                    {
                      data: numberOfRepairsPieChartData,
                      innerRadius:
                        numberOfRepairsPieChartData?.length > 10 ? 0 : 10,
                      paddingAngle:
                        numberOfRepairsPieChartData?.length > 10 ? 0 : 1,
                      cornerRadius:
                        numberOfRepairsPieChartData?.length > 10 ? 0 : 10,
                    },
                  ]}
                  hideLegend={true}
                  sx={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              </Box>
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 550,
                  height: "100%",
                  minHeight: 400,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="h5" align="center"></Typography>

                <Typography variant="h5" align="center">
                  Number of Preventative Maintenances
                  {dataQuery.data ? `: ${totalPMs}` : ""}
                </Typography>
                <PieChart
                  series={[
                    {
                      data: numberOfPMsPieChartData,
                      innerRadius:
                        numberOfPMsPieChartData?.length > 10 ? 0 : 10,
                      paddingAngle:
                        numberOfPMsPieChartData?.length > 10 ? 0 : 1,
                      cornerRadius:
                        numberOfPMsPieChartData?.length > 10 ? 0 : 10,
                    },
                  ]}
                  hideLegend={true}
                  sx={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              </Box>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <DataGrid
              rows={tableRows ?? []}
              columns={columns}
              loading={dataQuery.isLoading}
              disableColumnMenu
              hideFooterSelectedRowCount
              pagination
              paginationModel={{ page: search.page, pageSize: search.pageSize }}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              onPaginationModelChange={(m) => {
                navigate({
                  to: "/reports/maintenance",
                  search: (prev) => ({
                    ...(prev as any),
                    pageSize: m.pageSize,
                    page: m.pageSize !== (prev as any).pageSize ? 0 : m.page,
                  }),
                  replace: true,
                });
              }}
              rowCount={dataQuery.data?.total ?? tableRows.length}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              onClick={() => {
                reset({
                  from: dayjs().startOf("month"),
                  to: dayjs().endOf("month"),
                  techicians:
                    techiciansQuery?.data?.filter(
                      (t: User) => t?.user_role_id === ROLE_IDS.TECHNICIAN,
                    ) ?? [],
                  trss: "",
                });

                navigate({
                  to: "/reports/maintenance",
                  search: (prev) => ({
                    ...(prev as any),
                    from: dayjs().startOf("month").format("YYYY-MM-DD"),
                    to: dayjs().endOf("month").format("YYYY-MM-DD"),
                    trss: undefined,
                    technicians: [],
                    page: 0,
                    pageSize: 5,
                  }),
                  replace: true,
                });
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
