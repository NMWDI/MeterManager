import { createFileRoute } from "@tanstack/react-router";
import { MonitoringWellsView } from "@/views";

export const Route = createFileRoute("/monitoringwells")({
  component: MonitoringWellsView,
});
