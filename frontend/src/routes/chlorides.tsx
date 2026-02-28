import { createFileRoute } from "@tanstack/react-router";
import { ChloridesView } from "@/views";

export const Route = createFileRoute("/chlorides")({
  component: ChloridesView,
});
