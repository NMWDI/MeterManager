import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivitiesView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  optionalPositiveInt,
  optionalTrimmedString,
  routeSearchHydrator,
} from "@/utils";

const searchSchema = z.object({
  meter_id: optionalPositiveInt.catch(undefined).default(undefined),
  serial_number: optionalTrimmedString.catch("").default(""),
  work_order_id: optionalPositiveInt.catch(undefined).default(undefined),
});

export const Route = createFileRoute("/activities")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["activities:write"]}>
      <ActivitiesView />
    </ProtectedRoute>
  ),
});
