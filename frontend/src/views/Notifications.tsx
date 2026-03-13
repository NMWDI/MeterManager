import {
  Box,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import { BackgroundBox, CustomCardHeader } from "@/components";

const notificationItems = [
  {
    title: "No new alerts right now",
    description:
      "System notifications will appear here when new activity needs your attention.",
    icon: NotificationsOutlinedIcon,
  },
  {
    title: "Profile and account changes",
    description:
      "Updates related to your account preferences and settings will be listed here.",
    icon: SettingsOutlinedIcon,
  },
  {
    title: "Read status support",
    description:
      "This page is ready for unread and read notification states when those are added.",
    icon: MarkEmailReadOutlinedIcon,
  },
] as const;

export const Notifications = () => {
  return (
    <BackgroundBox>
      <Card
        sx={{
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #fbfdff 0%, #f3f8ff 55%, #eef4fb 100%)",
        }}
      >
        <CustomCardHeader
          title="Notifications"
          icon={NotificationsOutlinedIcon}
        />
        <CardContent sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
          <Stack spacing={2}>
            <Box
              sx={{
                px: 2,
                py: 1.75,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.78)",
                border: "1px solid",
                borderColor: "rgba(15, 23, 42, 0.08)",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Notification Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                There are no live notifications connected yet. This page gives
                the topbar menu and bell button a dedicated destination.
              </Typography>
            </Box>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <List disablePadding>
                {notificationItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Box key={item.title}>
                      <ListItem sx={{ py: 1.25, px: 2 }}>
                        <ListItemIcon sx={{ minWidth: 38 }}>
                          <Icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={700}>
                              {item.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < notificationItems.length - 1 ? <Divider /> : null}
                    </Box>
                  );
                })}
              </List>
            </Card>
          </Stack>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
