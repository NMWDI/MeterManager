import { createFileRoute } from "@tanstack/react-router";
import { PartsView } from "@/views";

export const Route = createFileRoute("/manage/parts/")({
  component: PartsView,
});
