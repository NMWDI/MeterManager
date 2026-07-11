import { Grid } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { BackgroundBox } from "@/components";
import { Route } from "@/routes/manage/serviceaccounts";
import { ServiceAccountDetailsCard } from "@/views/UserManagement/ServiceAccountDetailsCard";
import { ServiceAccountsTable } from "@/views/UserManagement/ServiceAccountsTable";

export const ServiceAccountManagementView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/serviceaccounts",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <ServiceAccountsTable
            onSelectServiceAccount={(id: number) =>
              setSearch((prev) => ({
                ...prev,
                service_account_id: id,
                service_account_add: false,
              }))
            }
            onCreateServiceAccount={() =>
              setSearch((prev) => ({
                ...prev,
                service_account_id: undefined,
                service_account_add: true,
              }))
            }
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ServiceAccountDetailsCard
            serviceAccountId={search.service_account_id}
            serviceAccountAddMode={search.service_account_add}
          />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
