import { PM_COLORS } from "../constants";

export const getMeterMarkerColor = (last_pm: string) => {
  const last_pm_date = new Date(last_pm);
  if (last_pm_date.getMonth() >= 7) {
    return PM_COLORS[
      last_pm_date.getFullYear() + "/" + (last_pm_date.getFullYear() + 1)
    ];
  } else {
    return PM_COLORS[
      last_pm_date.getFullYear() - 1 + "/" + last_pm_date.getFullYear()
    ];
  }
}
