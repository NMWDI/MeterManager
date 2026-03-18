import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PartsView } from "@/views";
import {
  booleanParam,
  optionalPositiveInt,
  pageParam,
  triStateParam,
} from "@/utils";

const searchSchema = z.object({
  part_id: optionalPositiveInt.catch(undefined).default(undefined),
  part_add: booleanParam(true),
  part_q: z.string().catch("").default(""),
  part_in_use: triStateParam("true"),
  part_commonly_used: triStateParam("all"),
  p_page: pageParam(0, 0),
  p_pageSize: pageParam(25, 10),

  meter_type_id: optionalPositiveInt.catch(undefined).default(undefined),
  meter_type_add: booleanParam(true),
  meter_type_q: z.string().catch("").default(""),
  meter_type_in_use: triStateParam("true"),
  mt_page: pageParam(0, 0),
  mt_pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/manage/parts/")({
  validateSearch: searchSchema,
  component: PartsView,
});
