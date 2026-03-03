import { Chip, type ChipProps } from "@mui/material";

export type TriString = "all" | "true" | "false";

export const TristateToggle = ({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: TriString;
  onToggle: (value: TriString) => void;
}) => {
  const getColor = (): ChipProps["color"] | undefined => {
    switch (value) {
      case "true":
        return "success";
      case "false":
        return "error";
      default:
        return undefined;
    }
  };

  const getLabel = () => {
    switch (value) {
      case "true":
        return `Is ${label}`;
      case "false":
        return `Is Not ${label}`;
      default:
        return label;
    }
  };

  const nextValue = (v: TriString): TriString => {
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
      variant={value === "all" ? "outlined" : "filled"}
      onDelete={value === "all" ? undefined : () => onToggle("all")}
      onClick={() => onToggle(nextValue(value))}
    />
  );
};
