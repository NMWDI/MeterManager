import { useMemo, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  PlusOne,
  Search,
  Add,
  History,
  Build,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { Link, useNavigate } from "@tanstack/react-router";
import { useGetParts, useAddParts } from "@/service";
import { Route } from "@/routes/manage/parts/index";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IncreaseQuantityModal,
  IsTrueChip,
  ManageBreadcrumbTitle,
  TristateToggle,
} from "@/components";

export const PartsTable = ({
  onSelectPart,
  onCreatePart,
}: {
  onSelectPart: (id: number) => void;
  onCreatePart: () => void;
}) => {
  const partsList = useGetParts();
  const addParts = useAddParts();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/parts",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const cols: GridColDef[] = [
    { field: "part_number", headerName: "Part Number", width: 150 },
    { field: "description", headerName: "Description", width: 250 },
    {
      field: "part_type",
      headerName: "Part Type",
      width: 200,
      valueGetter: (params: any) => params?.name,
    },
    {
      field: "current_count",
      headerName: "Current Count",
      width: 150,
      renderCell: (params: any) => (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            gap: 2,
            justifyContent: "start",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{params.value}</Typography>
          <Link
            to="/manage/parts/$id/history"
            params={{ id: String(params.row.id) }}
            search={{
              to: dayjs().endOf("month").format("YYYY-MM-DD"),
              type: ["initial", "used", "added", "current"],
              q: "",
              page: 0,
              pageSize: 25,
            }}
            style={{ display: "inline-flex" }}
            onMouseDown={(e: any) => e.stopPropagation()}
            onClick={(e: any) => e.stopPropagation()}
          >
            <IconButton
              color="primary"
              size="small"
              aria-label="See Part History"
            >
              <History fontSize="small" />
            </IconButton>
          </Link>
        </Box>
      ),
    },
    {
      field: "in_use",
      headerName: "In Use",
      renderCell: (params: any) => <IsTrueChip assert={params.value == true} />,
    },
    {
      field: "commonly_used",
      headerName: "Commonly Used",
      renderCell: (params: any) => <IsTrueChip assert={params.value == true} />,
    },
  ];

  const filteredRows = useMemo(() => {
    const q = (search.part_q ?? "").toLowerCase();
    let rows = (partsList.data ?? []).filter(
      (row) =>
        row.part_number.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q) ||
        row.part_type?.name.toLowerCase().includes(q),
    );

    if (search.part_in_use !== "all") {
      const wantInUse = search.part_in_use === "true";
      rows = rows.filter((row) => row.in_use === wantInUse);
    }

    if (search.part_commonly_used !== "all") {
      const wantCommonlyUsed = search.part_commonly_used === "true";
      rows = rows.filter((row) => row.commonly_used === wantCommonlyUsed);
    }

    return rows;
  }, [
    partsList.data,
    search.part_q,
    search.part_in_use,
    search.part_commonly_used,
  ]);

  return (
    <Card>
      <CustomCardHeader
        title={<ManageBreadcrumbTitle current="Parts" />}
        icon={Build}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <TextField
              sx={{ m: 0, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Parts..."
              variant="outlined"
              size="small"
              value={search.part_q ?? ""}
              onChange={(event: any) =>
                setSearch((prev) => ({
                  ...prev,
                  part_q: event.target.value,
                  p_page: 0,
                }))
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Typography variant="body1" style={{ display: "inline" }}>
              Choose Filters:{" "}
            </Typography>
            <TristateToggle
              label="In Use"
              value={search.part_in_use}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  part_in_use: next,
                  p_page: 0,
                }))
              }
            />
            <TristateToggle
              label="Commonly Used"
              value={search.part_commonly_used}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  part_commonly_used: next,
                  p_page: 0,
                }))
              }
            />
          </Grid>
          <Grid item xs={12}>
            <DataGrid
              sx={{ height: 550, border: "none" }}
              rows={filteredRows ?? []}
              pagination
              paginationModel={{
                page: search.p_page,
                pageSize: search.p_pageSize,
              }}
              onPaginationModelChange={(model) =>
                setSearch((prev) => ({
                  ...prev,
                  p_pageSize: model.pageSize,
                  p_page:
                    model.pageSize !== prev.p_pageSize ? 0 : model.page,
                }))
              }
              pageSizeOptions={[10, 25, 50, 100]}
              rowSelectionModel={search.part_id ? [search.part_id] : []}
              loading={partsList.isLoading}
              columns={cols}
              disableColumnMenu
              onRowClick={(selectedRow) => {
                if (search.part_id === selectedRow.row.id) {
                  onCreatePart();
                  return;
                }

                onSelectPart(selectedRow.row.id);
              }}
              slots={{ footer: GridFooterWithButton }}
              slotProps={{
                footer: {
                  button: (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{
                        ml: { xs: 0, sm: 1 },
                        mt: { xs: 1, sm: 0 },
                        width: "100%",
                      }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={onCreatePart}
                        sx={{
                          flexShrink: 0,
                          width: { xs: "100%", sm: "auto" },
                        }}
                        startIcon={<Add fontSize="small" />}
                      >
                        <Box sx={{ display: { xs: "none", md: "inline" } }}>
                          Create
                        </Box>
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => setIncreaseOpen(true)}
                        sx={{
                          flexShrink: 0,
                          width: { xs: "100%", sm: "auto" },
                          "& .MuiButton-startIcon": {
                            mr: { xs: 0, md: 1 },
                          },
                        }}
                        disabled={
                          partsList.isLoading ||
                          !partsList.data ||
                          partsList.data.length === 0
                        }
                        startIcon={<PlusOne fontSize="small" />}
                      >
                        <Box sx={{ display: { xs: "none", md: "inline" } }}>
                          Increase Quantity
                        </Box>
                      </Button>
                    </Stack>
                  ),
                },
              }}
              disableColumnFilter
            />
          </Grid>
        </Grid>
      </CardContent>
      <IncreaseQuantityModal
        open={increaseOpen}
        onClose={() => setIncreaseOpen(false)}
        parts={partsList.data ?? []}
        loading={addParts.isLoading}
        onSubmit={(payload) => {
          addParts.mutate(
            {
              part_id: payload.part_id,
              count: payload.count,
              date: payload.date,
              note: payload.note,
            },
            {
              onSuccess: () => {
                enqueueSnackbar("Quantity increase submitted successfully.", {
                  variant: "success",
                });
                setIncreaseOpen(false);
                partsList.refetch();
              },
              onError: () => {
                enqueueSnackbar(
                  "Failed to submit quantity increase. Please try again.",
                  {
                    variant: "error",
                  },
                );
              },
            },
          );
        }}
      />
    </Card>
  );
};
