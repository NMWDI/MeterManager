import {
  FormatListBulletedOutlined,
  ScreenshotMonitor,
  Construction,
  MonitorHeart,
  Plumbing,
  Build,
  Science,
  People,
  Storage,
} from "@mui/icons-material";
import { SvgIconProps } from "@mui/material";
import { ComponentType } from "react";

export const BgColor = "#F8FAFC";

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<SvgIconProps>;
  role?: "Technician" | "Admin"; // restrict by role
  parent?: string; // e.g. "reports"
  badge?: () => number | undefined; // function for live counts
};

export const navConfig: NavItem[] = [
  { path: "/chlorides", label: "Chlorides", icon: Science },
  { path: "/monitoringwells", label: "Monitoring Wells", icon: MonitorHeart },

  // Technician
  {
    path: "/workorders",
    label: "Work Orders",
    icon: FormatListBulletedOutlined,
    role: "Technician",
  },
  {
    path: "/activities",
    label: "Activities",
    icon: Construction,
    role: "Technician",
  },
  {
    path: "/manage/meters",
    label: "Manage Meters",
    icon: ScreenshotMonitor,
    role: "Technician",
  },
  {
    path: "/manage/wells",
    label: "Manage Wells",
    icon: Plumbing,
    role: "Technician",
  },

  // Reports
  {
    path: "/reports/monitoringwells",
    label: "Monitoring Wells",
    icon: MonitorHeart,
    role: "Technician",
    parent: "reports",
  },
  {
    path: "/reports/maintenance",
    label: "Maintenance",
    icon: Construction,
    role: "Technician",
    parent: "reports",
  },
  {
    path: "/reports/partsused",
    label: "Parts Used",
    icon: Build,
    role: "Technician",
    parent: "reports",
  },
  {
    path: "/reports/chlorides",
    label: "Chlorides",
    icon: Science,
    role: "Technician",
    parent: "reports",
  },

  // Admin
  { path: "/manage/parts", label: "Manage Parts", icon: Build, role: "Admin" },
  { path: "/manage/users", label: "Manage Users", icon: People, role: "Admin" },
  {
    path: "/manage/backups",
    label: "Manage Backups",
    icon: Storage,
    role: "Admin",
  },
];

export const PM_COLORS: { [key: string]: string } = {
  "2020/2021": "brown",
  "2021/2022": "green",
  "2022/2023": "purple",
  "2023/2024": "turquoise",
  "2024/2025": "red",
  "2025/2026": "white",
  "2026/2027": "yellow",
  "2027/2028": "brown",
  "2028/2029": "blue",
};
