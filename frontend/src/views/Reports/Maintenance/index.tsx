import { useMemo } from "react";
import { ArrowBack, PictureAsPdf, Plumbing } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledAutocomplete from "../../../components/RHControlled/ControlledAutocomplete";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import { CustomCardHeader } from "../../../components/CustomCardHeader";
import { BackgroundBox } from "../../../components/BackgroundBox";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import { useAuthHeader } from "react-auth-kit";
import { API_URL } from "../../../config";

interface User {
  full_name: string;
  id: number;
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
  from: dayjs(),
  to: dayjs(),
  techicians: [],
  trss: "",
};

export const MaintenanceReportView = () => {
  const authHeader = useAuthHeader();
  const techiciansQuery = useQuery({
    queryKey: ["Repairs", "report", "techicians"],
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
  });

  const { control, reset, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const allTechniciansOption = { id: -1, full_name: "All Technicians" };

  const technicianOptions = useMemo(() => {
    const base = techiciansQuery.data ?? [];
    return [...base, allTechniciansOption];
  }, [techiciansQuery.data]);

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
              <ControlledTextbox
                sx={{ minWidth: "30rem" }}
                name="trss"
                label="TRSS"
                control={control}
                size="medium"
              />
            </Grid>
            <Grid item>
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
                onChange={(_, selected) => {
                  if (selected.some((tech) => tech.id === -1)) {
                    // Replace selection with all (excluding the synthetic "All Technicians")
                    setValue("techicians", techiciansQuery.data ?? []);
                  } else {
                    setValue("techicians", selected);
                  }
                }}
                renderInput={(params) => {
                  if (techiciansQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      label="Technician(s)"
                      sx={{ minWidth: "15rem" }}
                      size="medium"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
                renderTags={(selected, getTagProps) => {
                  const allSelected =
                    selected.length === techiciansQuery.data?.length &&
                    selected.every((sel) =>
                      techiciansQuery.data?.some((t) => t.id === sel.id),
                    );

                  if (allSelected) {
                    return (
                      <Chip
                        label="All Technicians"
                        {...getTagProps({ index: 0 })}
                      />
                    );
                  }

                  return selected.map((option, index) => (
                    <Chip
                      key={option.id}
                      label={option.full_name}
                      {...getTagProps({ index })}
                    />
                  ));
                }}
              />
            </Grid>
          </Grid>
          <Grid container></Grid>
          <Grid container>
            <Grid item>
              <Button onClick={() => reset()}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
