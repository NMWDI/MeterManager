import { MonitoredWell } from "../interfaces";

export const separateAndSortMonitoredWells = (
  wells: MonitoredWell[] = [],
): [MonitoredWell[], MonitoredWell[]] => {
  const sortWells = (w: MonitoredWell[]) =>
    w.slice().sort((a, b) => {
      if (!a.name) return 1; // Move undefined/null names to the bottom
      if (!b.name) return -1;
      return a.name.localeCompare(b.name);
    });

  const outsideRecorderWells = sortWells(
    wells.filter((well) => well.outside_recorder === true),
  );
  const regularWells = sortWells(
    wells.filter((well) => well.outside_recorder !== true),
  );

  return [outsideRecorderWells, regularWells];
};
