import { Chip } from "@mui/material";
import { useEffect, useState } from "react";

export const TristateToggle = ({ label, onToggle }: any) => {
  const [toggleState, setToggleState] = useState<boolean>();

  useEffect(() => {
    onToggle(toggleState);
  }, [toggleState]);

  function getColor() {
    switch (toggleState) {
      case true:
        return "success";
      case false:
        return "error";
      default:
        return undefined;
    }
  }

  function getLabel() {
    switch (toggleState) {
      case true:
        return "Is " + label;
      case false:
        return "Is Not " + label;
      default:
        return label;
    }
  }

  return (
    <Chip
      sx={{ ml: 2 }}
      label={getLabel()}
      color={getColor()}
      onDelete={
        toggleState != undefined ? () => setToggleState(undefined) : undefined
      }
      onClick={() => setToggleState(!toggleState)}
    />
  );
};
