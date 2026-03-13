import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Tab,
  Tabs,
  Box,
  InputAdornment,
} from "@mui/material";
import { WaterDrop } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "@mui/icons-material";
import { Route } from "@/routes/manage/wells";
import { CustomCardHeader, ManageBreadcrumbTitle, TabPanel } from "@/components";

import WellSelectionTable from "@/views/WellManagement/WellSelectionTable";
import WellSelectionMap from "@/views/WellManagement/WellSelectionMap";

const tabToIndex = (tab: "list" | "map") => (tab === "list" ? 0 : 1);
const indexToTab = (i: number): "list" | "map" => (i === 1 ? "map" : "list");

export const WellsTable = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [qInput, setQInput] = useState(search.q ?? "");
  useEffect(() => setQInput(search.q ?? ""), [search.q]);

  const currentTabIndex = tabToIndex(search.tab);
  const handleTabChange = (_: React.SyntheticEvent, newTabIndex: number) => {
    navigate({
      to: "/manage/wells",
      search: (prev) => ({ ...(prev as any), tab: indexToTab(newTabIndex) }),
      replace: true,
    });
  };

  const applySearch = (value: string) => {
    const next = value.trim();
    navigate({
      to: "/manage/wells",
      search: (prev) => ({
        ...(prev as any),
        q: next || undefined,
        page: 0, // reset paging on new search
      }),
      replace: true,
    });
  };

  return (
    <Card
      sx={{
        height: "100%",
        minHeight: "fit-content",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CustomCardHeader
        title={<ManageBreadcrumbTitle current="Wells" />}
        icon={WaterDrop}
      />
      <CardContent>
        <Grid container justifyContent="space-between">
          <Grid item xs={6}>
            <Tabs value={currentTabIndex} onChange={handleTabChange}>
              <Tab label="Well List" />
              <Tab label="Well Map" />
            </Tabs>
          </Grid>
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <TextField
              sx={{ m: 0, pl: 2, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Wells..."
              variant="outlined"
              size="small"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch(qInput);
              }}
              helperText="Press Enter to apply"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ height: "fit-content" }}>
          <TabPanel currentTabIndex={currentTabIndex} tabIndex={0}>
            <WellSelectionTable wellSearchQueryProp={search.q ?? ""} />
          </TabPanel>
          <TabPanel currentTabIndex={currentTabIndex} tabIndex={1}>
            <WellSelectionMap wellSearchQueryProp={search.q ?? ""} />
          </TabPanel>
        </Box>
      </CardContent>
    </Card>
  );
};
