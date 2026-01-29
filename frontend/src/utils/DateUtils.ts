export const toGMT6String = (date: Date): string => {
  return date.toLocaleString("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

export function toYYYYMMDD(d: Date): string;
export function toYYYYMMDD(iso?: string | null): string;

export function toYYYYMMDD(input?: Date | string | null): string {
  if (!input) return "-";

  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}
