import { Controller, type Control } from "react-hook-form";
import {
  Box,
  Button,
  ListItemIcon,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  type SvgIconProps,
} from "@mui/material";
import type { ComponentType } from "react";
import { SectionSurface } from "./SectionSurface";

type NavOption = {
  path: string;
  label: string;
  icon: ComponentType<SvgIconProps>;
};

export function PreferencesSection({
  redirectControl,
  redirectOptions,
  onRedirectSubmit,
  isRedirectLoading,
  isRedirectSaving,
  isRedirectSelectionUnchanged,
  onClearCachedData,
  isClearingCachedData,
}: {
  redirectControl: Control<{ redirect_page: string }>;
  redirectOptions: NavOption[];
  onRedirectSubmit: React.FormEventHandler<HTMLFormElement>;
  isRedirectLoading: boolean;
  isRedirectSaving: boolean;
  isRedirectSelectionUnchanged: boolean;
  onClearCachedData: () => void;
  isClearingCachedData: boolean;
}) {
  return (
    <Stack spacing={1.5}>
      <SectionSurface
        title="Default landing page"
        description="Choose where the app should take you after you sign in."
      >
        <Box component="form" onSubmit={onRedirectSubmit} py={1}>
          <Stack spacing={2}>
            {isRedirectLoading ? (
              <Skeleton variant="rounded" height={40} />
            ) : (
              <Controller
                name="redirect_page"
                control={redirectControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    size="small"
                    label="Redirect page"
                  >
                    {redirectOptions.map((route) => {
                      const RouteIcon = route.icon;

                      return (
                        <MenuItem key={route.path} value={route.path}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-start",
                              alignItems: "center",
                              gap: 1,
                              width: "100%",
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 0,
                                color: "inherit",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                              }}
                            >
                              <RouteIcon fontSize="small" />
                            </ListItemIcon>
                            <Box
                              component="span"
                              sx={{
                                display: "flex",
                                justifyContent: "flex-start",
                                alignItems: "center",
                              }}
                            >
                              {route.label}
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </TextField>
                )}
              />
            )}
            <Box>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={
                  isRedirectLoading ||
                  isRedirectSaving ||
                  isRedirectSelectionUnchanged
                }
              >
                Save preference
              </Button>
            </Box>
          </Stack>
        </Box>
      </SectionSurface>

      <SectionSurface
        title="Cached map data"
        description="Clear saved client-side caches if the app feels out of sync."
        actions={
          <Button
            variant="outlined"
            color="error"
            onClick={onClearCachedData}
            disabled={isClearingCachedData}
          >
            Clear cache
          </Button>
        }
      >
        <Box />
      </SectionSurface>
    </Stack>
  );
}
