import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/internal/error-preview")({
  component: ErrorPreviewComponent,
});

function ErrorPreviewComponent() {
  throw new Error(
    "Internal preview route crash. Use this page only to verify the styled router error screen and copied URL details.",
  );
}
