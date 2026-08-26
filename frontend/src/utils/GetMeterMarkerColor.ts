import { PM_COLORS } from "../constants";

export const getMeterMarkerColor = (last_pm: string) => {
  const dateParts = last_pm.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!dateParts) {
    return "black";
  }

  const year = Number(dateParts[1]);
  const month = Number(dateParts[2]);
  const fiscalYearStart = month >= 7 ? year : year - 1;
  const fiscalYearKey = `${fiscalYearStart}/${fiscalYearStart + 1}`;

  return PM_COLORS[fiscalYearKey] ?? "black";
};

export const getLatestMeterActivityDate = (
  activityDates: Array<string | null>,
) => {
  return activityDates.reduce<string | null>((latestDate, activityDate) => {
    if (!activityDate) {
      return latestDate;
    }

    if (!latestDate) {
      return activityDate;
    }

    return new Date(activityDate).getTime() > new Date(latestDate).getTime()
      ? activityDate
      : latestDate;
  }, null);
};
