import React, { useEffect, useState } from "react";
import { ControlledSelect } from "./ControlledSelect";
import { useFetchWithAuth } from "../../hooks/useFetchWithAuth";

interface Unit {
  id: number;
  name: string;
}

interface ControlledUnitsSelectProps {
  control: any;
  name: string;
  label: string;
  error?: string;
  sx?: any;
  [key: string]: any; // Allow additional props
}

const ControlledUnitsSelect: React.FC<ControlledUnitsSelectProps> = ({
  control,
  name,
  label,
  error,
  sx,
  ...childProps
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchWithAuth = useFetchWithAuth();

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const data = await fetchWithAuth({ method: "GET", route: "/units" });
        setUnits(data);
      } catch (error) {
        console.error("Failed to fetch units:", error);
      } finally {
        setLoading(false);
      }
    };

    if (units.length === 0) {
      fetchUnits();
    }
  }, [fetchWithAuth, units.length]);

  return (
    <ControlledSelect
      control={control}
      name={name}
      label={label}
      error={error}
      sx={sx}
      {...childProps}
      value={loading ? "Loading..." : childProps.value}
      options={loading ? [{ id: "Loading...", name: "Loading..." }] : units}
      getOptionLabel={(option: Unit) => option.name}
    />
  );
};

export default ControlledUnitsSelect;