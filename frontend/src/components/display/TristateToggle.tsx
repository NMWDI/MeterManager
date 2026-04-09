import { Chip, type ChipProps } from "@mui/material";

export type TriString = "all" | "true" | "false";
type TriStateKey = "all" | "true" | "false";
type TriStateMap<T extends string> = Record<TriStateKey, T>;

const DEFAULT_STATE_VALUES: TriStateMap<TriString> = {
  all: "all",
  true: "true",
  false: "false",
};

export const TristateToggle = <T extends string = TriString>({
  label,
  value,
  onToggle,
  stateValues,
  stateLabels,
}: {
  label: string;
  value: T;
  onToggle: (value: T) => void;
  stateValues?: TriStateMap<T>;
  stateLabels?: Partial<Record<TriStateKey, string>>;
}) => {
  const resolvedStateValues = stateValues ?? (DEFAULT_STATE_VALUES as TriStateMap<T>);

  const getCurrentKey = (): TriStateKey => {
    if (value === resolvedStateValues.true) return "true";
    if (value === resolvedStateValues.false) return "false";
    return "all";
  };

  const currentKey = getCurrentKey();

  const getColor = (): ChipProps["color"] | undefined => {
    switch (currentKey) {
      case "true":
        return "success";
      case "false":
        return "error";
      default:
        return undefined;
    }
  };

  const getLabel = () => {
    if (stateLabels?.[currentKey]) {
      return stateLabels[currentKey];
    }

    switch (currentKey) {
      case "true":
        return `Is ${label}`;
      case "false":
        return `Is Not ${label}`;
      default:
        return label;
    }
  };

  const nextKey = (v: TriStateKey): TriStateKey => {
    switch (v) {
      case "all":
        return "true";
      case "true":
        return "false";
      case "false":
        return "all";
    }
  };

  return (
    <Chip
      sx={{ ml: 2 }}
      label={getLabel()}
      color={getColor()}
      variant={currentKey === "all" ? "outlined" : "filled"}
      onDelete={
        currentKey === "all"
          ? undefined
          : () => onToggle(resolvedStateValues.all)
      }
      onClick={() => onToggle(resolvedStateValues[nextKey(currentKey)])}
    />
  );
};
