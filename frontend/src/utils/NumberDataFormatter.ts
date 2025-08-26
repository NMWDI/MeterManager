// Small formatter so numbers look nice (e.g., 1,234.57) and undefined shows "—"
export const formatNumberData = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
    : "—";
