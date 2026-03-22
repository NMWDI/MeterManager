import { QueryErrorBox } from "@/components";
import { Plot, Table } from "@/views/Chlorides";
import { RegionMeasurementDTO } from "@/interfaces";
import { Dayjs } from "dayjs";

type ChloridesPlotSectionProps = {
  isLoading: boolean;
  isError: boolean;
  isRegionSelected: boolean;
  rows: RegionMeasurementDTO[];
  onRetry: () => void;
};

export const ChloridesPlotSection = ({
  isLoading,
  isError,
  isRegionSelected,
  rows,
  onRetry,
}: ChloridesPlotSectionProps) => {
  if (isError) {
    return (
      <QueryErrorBox
        title="Unable to Load Plot"
        message="We couldn’t load chloride plot data for this region."
        onRetry={onRetry}
        minHeight={600}
      />
    );
  }

  return (
    <Plot
      isLoading={isLoading}
      emptyMessage={
        isRegionSelected
          ? undefined
          : "Please select a region to see chloride data."
      }
      manual_dates={rows.map((m) => m.timestamp)}
      manual_vals={rows.map((m) => ({
        value: m.value,
        well: m.well.ra_number,
      }))}
    />
  );
};

type ChloridesTableSectionProps = {
  rows: RegionMeasurementDTO[];
  isRegionSelected: boolean;
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
      well: {
        id: number;
        ra_number: string;
      };
    };
  }) => void;
};

export const ChloridesTableSection = ({
  rows,
  isRegionSelected,
  isError,
  onRetry,
  onOpenModal,
  onMeasurementSelect,
}: ChloridesTableSectionProps) => {
  if (isError) {
    return (
      <QueryErrorBox
        title="Unable to Load Table"
        message="We couldn’t load chloride measurements for this region."
        onRetry={onRetry}
        minHeight={600}
      />
    );
  }

  return (
    <Table
      rows={rows}
      isRegionSelected={isRegionSelected}
      onOpenModal={onOpenModal}
      onMeasurementSelect={onMeasurementSelect}
    />
  );
};
