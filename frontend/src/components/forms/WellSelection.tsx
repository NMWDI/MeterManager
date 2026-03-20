import { useState } from "react";
import { TextField } from "@mui/material";
import { useDebounce } from "use-debounce";
import { Autocomplete } from "@mui/material";
import { useGetWells } from "@/service";
import { Well } from "@/interfaces";

export default function WellSelection({
  selectedWell,
  onSelection,
}: {
  selectedWell: Well | null;
  onSelection: (well: Well | null) => void;
}) {
  const [wellSearchQuery, setWellSearchQuery] = useState<string>("");
  const [wellSearchQueryDebounced] = useDebounce(wellSearchQuery, 250);

  const wellList = useGetWells({
    search_string:
      wellSearchQueryDebounced != "" ? wellSearchQueryDebounced : undefined,
  });

  return (
    <Autocomplete
      id="well-selection-autocomplete"
      sx={{ width: 300 }}
      value={selectedWell}
      onChange={(_, value) => onSelection(value)}
      inputValue={wellSearchQuery}
      onInputChange={(_, value) => setWellSearchQuery(value)}
      disableClearable={false}
      options={wellList.data?.items ?? []}
      getOptionLabel={(op: Well) => op?.ra_number ?? ""}
      isOptionEqualToValue={(a: any, b: any) => {
        return a?.id == b?.id;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Well"
          size="small"
          placeholder="Begin typing to search"
        />
      )}
    />
  );
}
