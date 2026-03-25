import { Controller, type Control } from "react-hook-form";
import {
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { ImageUploadWithPreview, RoleChip } from "@/components";
import { SectionSurface } from "./SectionSurface";

type SettingsUser = {
  full_name?: string;
  email?: string;
  username?: string;
  display_name?: string;
  avatar_img?: string | null;
  user_role?: {
    name?: string;
  } | null;
};

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        {typeof value === "string" ? (
          <Chip
            sx={{ fontFamily: "monospace", maxWidth: "100%" }}
            size="small"
            label={value}
            variant="outlined"
          />
        ) : (
          value
        )}
      </Box>
    </Box>
  );
}

export function ProfileSection({
  user,
  isEditing,
  setIsEditing,
  displayNameControl,
  onCancelEdit,
  onSaveDisplayName,
  isSavingDisplayName,
  avatarFiles,
  setAvatarFiles,
  avatarUploadKey,
  onAvatarSubmit,
  onClearAvatar,
  isSavingAvatar,
  isRemovingAvatar,
}: {
  user: SettingsUser | null;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  displayNameControl: Control<{ display_name: string }>;
  onCancelEdit: () => void;
  onSaveDisplayName: () => void;
  isSavingDisplayName: boolean;
  avatarFiles: File[];
  setAvatarFiles: (files: File[]) => void;
  avatarUploadKey: number;
  onAvatarSubmit: () => void;
  onClearAvatar: () => void;
  isSavingAvatar: boolean;
  isRemovingAvatar: boolean;
}) {
  return (
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={6}>
        <InfoTile label="Full name" value={user?.full_name ?? "N/A"} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <InfoTile label="Email" value={user?.email ?? "N/A"} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <InfoTile label="Username" value={user?.username ?? "N/A"} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <InfoTile
          label="Role"
          value={<RoleChip role={user?.user_role?.name ?? "N/A"} />}
        />
      </Grid>
      <Grid item xs={12}>
        <SectionSurface
          title="Display name"
          description="Shown across the application."
          actions={
            !isEditing ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={user?.display_name ?? "N/A"}
                  variant="outlined"
                  sx={{ fontFamily: "monospace", maxWidth: 180 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              </Stack>
            ) : null
          }
        >
          {!isEditing ? null : (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Controller
                name="display_name"
                control={displayNameControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    size="small"
                    autoFocus
                    label="Display name"
                    sx={{ minWidth: { xs: "100%", sm: 280 } }}
                  />
                )}
              />
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={onSaveDisplayName}
                disabled={isSavingDisplayName}
              >
                Save
              </Button>
            </Stack>
          )}
        </SectionSurface>
      </Grid>
      <Grid item xs={12}>
        <SectionSurface
          title="Avatar"
          description="Upload or replace your account image."
        >
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <ImageUploadWithPreview
                key={avatarUploadKey}
                fileLimit={1}
                onFilesChange={setAvatarFiles}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ pr: { md: 1.5 } }}
                justifyContent={{ xs: "flex-start", md: "flex-end" }}
                alignItems="center"
                flexWrap="wrap"
                rowGap={1.5}
              >
                <Button
                  variant="contained"
                  onClick={onAvatarSubmit}
                  disabled={
                    avatarFiles.length === 0 ||
                    isSavingAvatar ||
                    isRemovingAvatar
                  }
                >
                  Save new avatar
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onClearAvatar}
                  disabled={
                    !user?.avatar_img || isSavingAvatar || isRemovingAvatar
                  }
                >
                  Remove current avatar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </SectionSurface>
      </Grid>
    </Grid>
  );
}
