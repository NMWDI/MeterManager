import { ArrowBack, Build, PictureAsPdf } from "@mui/icons-material";
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import { API_URL } from "../../../config";
import { useAuthHeader } from "react-auth-kit";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { BackgroundBox } from "../../../components/BackgroundBox";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

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
  parts: yup
    .array()
    .of(yup.number().required())
    .min(1, "At least one Part is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
  parts: [],
};

export const PartsUsedReportView = () => {
  const { control, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const authHeader = useAuthHeader();
  const partsQuery = useQuery<Part[]>({
    queryKey: ["Inventory", "report", "parts"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/parts`, {
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

  const selectedParts = (partsQuery?.data ?? []).filter((part) =>
    watch("parts")?.includes(part.id),
  );

  let runningTotal = 0;

  const rows = selectedParts.map((part) => {
    const unitPrice = part.price ?? 0;
    const quantity = part.count ?? 0;
    const total = quantity * unitPrice;

    runningTotal += total;

    return {
      id: part.id,
      part_number: part.part_number,
      description: part.description,
      price: unitPrice,
      quantity,
      total,
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
                <IconButton aria-label="export report as pdf">
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
                      options={
                        partsQuery?.data?.filter(
                          (opt: Part) => opt && opt.id != null,
                        ) ?? []
                      }
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
              <Button onClick={() => reset()}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
