import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { ControlledUserSelect } from "@/components";
import {
  CreateNotificationPayload,
  NotificationType,
  User,
  UserRole,
} from "@/interfaces";
import { getRoleColor } from "@/utils";

const getRoleChipColor = (role?: string) => {
  const color = getRoleColor(role);
  return color === "inherit" ? "default" : color;
};

const formatNotificationTypeName = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type FormValues = {
  users: User[];
};

export const CreateNotificationModal = ({
  open,
  onClose,
  users,
  roles,
  notificationTypes,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  roles: UserRole[];
  notificationTypes: NotificationType[];
  onSubmit: (payload: CreateNotificationPayload) => void;
  loading?: boolean;
}) => {
  const activeUsers = useMemo(
    () => users.filter((user) => !user.disabled),
    [users],
  );
  const { control, reset, watch } = useForm<FormValues>({
    defaultValues: { users: [] },
  });
  const selectedUsers = watch("users") ?? [];

  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [selectedType, setSelectedType] = useState<NotificationType | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    reset({ users: [] });
    setSelectedRoles([]);
    setSelectedType(notificationTypes[0] ?? null);
    setTitle("");
    setMessage("");
  }, [open, notificationTypes, reset]);

  const hasRecipients = selectedUsers.length > 0 || selectedRoles.length > 0;
  const canSave =
    hasRecipients &&
    !!selectedType &&
    title.trim().length > 0 &&
    message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSave || !selectedType) return;

    onSubmit({
      user_ids: selectedUsers.map((user) => user.id),
      role_ids: selectedRoles.map((role) => role.id),
      notification_type_id: selectedType.id,
      title: title.trim(),
      message: message.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="create-notification-title"
    >
      <DialogTitle id="create-notification-title">
        Create Notification
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <DialogContentText>
            Select one or more roles or individual users, then enter the
            notification details.
          </DialogContentText>
          <Autocomplete
            multiple
            options={roles}
            value={selectedRoles}
            onChange={(_, value) => setSelectedRoles(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderTags={(selected, getTagProps) =>
              selected.map((option, index) => (
                <Chip
                  label={option.name}
                  color={getRoleChipColor(option.name)}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Roles"
                placeholder="Select roles"
              />
            )}
          />
          <ControlledUserSelect
            name="users"
            control={control}
            label="Users"
            multiple
            options={activeUsers}
            helperText={hasRecipients ? " " : "Choose at least one role or user."}
            error={!hasRecipients ? "Choose at least one role or user." : undefined}
            sx={{ width: "100%" }}
          />
          <Autocomplete
            options={notificationTypes}
            value={selectedType}
            onChange={(_, value) => setSelectedType(value)}
            getOptionLabel={(option) => formatNotificationTypeName(option.name)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Type"
                error={!selectedType}
                helperText={!selectedType ? "Notification type is required." : " "}
              />
            )}
          />
          <TextField
            size="small"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={title.trim().length === 0}
            helperText={title.trim().length === 0 ? "Title is required." : " "}
          />
          <TextField
            size="small"
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={3}
            error={message.trim().length === 0}
            helperText={message.trim().length === 0 ? "Message is required." : " "}
          />
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={!canSave || loading}
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
          }}
          startIcon={<Save fontSize="small" />}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
