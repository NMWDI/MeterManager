import { QueryErrorBox } from "@/components";
import {
  MonitoredWell,
  ST2Measurement,
  WellMeasurementDTO,
} from "@/interfaces";
import { Plot, Table } from "@/views/MonitoringWells";
import { Dayjs } from "dayjs";

type MonitoringWellsPlotSectionProps = {
  manualMeasurements?: WellMeasurementDTO[];
  st2Measurements?: ST2Measurement[];
  johnsonSensorDataMeasurements?: WellMeasurementDTO[];
  isWellSelected: boolean;
  isLoading: boolean;
  loadingSources?: string[];
  isError: boolean;
  onRetry: () => void;
};

export const MonitoringWellsPlotSection = ({
  manualMeasurements,
  st2Measurements,
  johnsonSensorDataMeasurements,
  isWellSelected,
  isLoading,
  loadingSources,
  isError,
  onRetry,
}: MonitoringWellsPlotSectionProps) => {
  if (isError) {
    return (
      <QueryErrorBox
        title="Unable to Load Plot"
        message="We couldn’t load monitoring well plot data for this site."
        onRetry={onRetry}
        minHeight={600}
      />
    );
  }

  return (
    <Plot
      emptyMessage={
        isWellSelected
          ? undefined
          : "Please select a well to see monitoring well data."
      }
      isLoading={isLoading}
      loadingSources={loadingSources}
      manual_dates={(Array.isArray(manualMeasurements)
        ? manualMeasurements
        : []
      ).map((m) => m.timestamp)}
      manual_vals={(Array.isArray(manualMeasurements)
        ? manualMeasurements
        : []
      ).map((m) => m.value)}
      logger_dates={
        Array.isArray(st2Measurements)
          ? st2Measurements.map((m) => m.resultTime)
          : []
      }
      logger_vals={
        Array.isArray(st2Measurements)
          ? st2Measurements.map((m) => m.result)
          : []
      }
      sensor_dates={
        Array.isArray(johnsonSensorDataMeasurements)
          ? johnsonSensorDataMeasurements.map((m) => m.timestamp)
          : undefined
      }
      sensor_vals={
        Array.isArray(johnsonSensorDataMeasurements)
          ? johnsonSensorDataMeasurements.map((m) => m.value)
          : undefined
      }
    />
  );
};

type MonitoringWellsTableSectionProps = {
  rows: WellMeasurementDTO[];
  selectedWell?: MonitoredWell;
  isWellSelected: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onOpenModal: () => void;
  onMeasurementSelect: (data: {
    row: {
      id: number;
      timestamp: Dayjs;
      value: number;
      submitting_user: {
        id: number;
      };
    };
  }) => void;
};

export const MonitoringWellsTableSection = ({
  rows,
  selectedWell,
  isWellSelected,
  isLoading,
  isError,
  onRetry,
  onOpenModal,
  onMeasurementSelect,
}: MonitoringWellsTableSectionProps) => {
  if (isError) {
    return (
      <QueryErrorBox
        title="Unable to Load Table"
        message="We couldn’t load manual water level measurements for this site."
        onRetry={onRetry}
        minHeight={600}
      />
    );
  }

  return (
    <Table
      rows={rows}
      selectedWell={selectedWell}
      isWellSelected={isWellSelected}
      isLoading={isLoading}
      onOpenModal={onOpenModal}
      onMeasurementSelect={onMeasurementSelect}
    />
  );
};
