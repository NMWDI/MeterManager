import { useState } from "react";
import { TextField } from "@mui/material";
import { useDebounce } from "use-debounce";
import { useGetWells } from "@/service";
import { Well } from "@/interfaces";

import { ControlledAutocomplete } from "./ControlledAutocomplete";

export const ControlledWellSelection = ({
  name,
  control,
  ...childProps
}: any) => {
  const [wellSearchQuery, setWellSearchQuery] = useState<string>("");
  const [wellSearchQueryDebounced] = useDebounce(wellSearchQuery, 250);

  const wellList = useGetWells({
    search_string:
      wellSearchQueryDebounced != "" ? wellSearchQueryDebounced : undefined,
  });

  return (
    <ControlledAutocomplete
      control={control}
      name={name}
      disableClearable={false}
      defaultValue={null}
      options={wellList.data?.items ?? []}
      {...childProps}
      disabled={childProps.disabled || wellList.isLoading}
      onInputChange={(_: any, query: string) => {
        setWellSearchQuery(query);
      }}
      getOptionLabel={(op: Well) => op?.ra_number ?? ""}
      renderInput={(params: any) => {
        if (wellList.isLoading) params.inputProps.value = "Loading...";
        return (
          <TextField
            {...params}
            label="Well"
            size="small"
            placeholder="Begin typing to search"
            {...childProps}
          />
        );
      }}
    />
  );
};
