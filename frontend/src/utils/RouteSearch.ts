import { redirect } from "@tanstack/react-router";
import dayjs from "dayjs";
import { z } from "zod";

export const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const optionalPositiveInt = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}, z.number().int().positive().optional());

export const optionalNonNegativeInt = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}, z.number().int().nonnegative().optional());

export const optionalTrimmedString = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  return s.length ? s : undefined;
}, z.string().optional());

export const booleanParam = (defaultValue: boolean) =>
  z
    .preprocess((val) => {
      const raw = firstValue(val);
      if (raw === undefined || raw === null || raw === "") return undefined;
      if (raw === true || raw === "true" || raw === "1" || raw === 1)
        return true;
      if (raw === false || raw === "false" || raw === "0" || raw === 0)
        return false;
      return undefined;
    }, z.boolean().optional())
    .catch(defaultValue)
    .default(defaultValue);

export const triStateParam = (defaultValue: "all" | "true" | "false") =>
  z.enum(["all", "true", "false"]).catch(defaultValue).default(defaultValue);

export const isoDateParam = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const s = String(raw).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}, z.string().optional());

export const dayjsDateParam = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const s = String(raw).trim();
  return dayjs(s, "YYYY-MM-DD", true).isValid() ? s : undefined;
}, z.string().optional());

export const positiveIntListParam = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return [];
    const raw = Array.isArray(val) ? val : [val];
    const nums = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => String(v).trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    return Array.from(new Set(nums));
  }, z.array(z.number().int().positive()))
  .catch([])
  .default([]);

export const pageParam = (defaultValue = 0, min = 0, max = 200) =>
  z.coerce
    .number()
    .int()
    .min(min)
    .max(max)
    .catch(defaultValue)
    .default(defaultValue);

export function routeSearchHydrator<TSearch extends Record<string, unknown>>(
  to: string,
  search: TSearch,
  searchStr: string,
) {
  const current = new URLSearchParams(
    searchStr.startsWith("?") ? searchStr : "",
  );
  const shouldHydrate = Object.entries(search).some(([key, value]) => {
    if (value === undefined || value === null) return false;
    return !current.has(key);
  });

  if (shouldHydrate) {
    throw redirect({
      to,
      replace: true,
      search: search as any,
    });
  }
}
