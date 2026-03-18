import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/views";

export const Route = createFileRoute("/")({
  component: Home,
});
