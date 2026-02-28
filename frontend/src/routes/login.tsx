import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/views";

export const Route = createFileRoute("/login")({
  component: Login,
});
