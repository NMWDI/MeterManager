import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import { Cancel } from "@mui/icons-material";

interface chipselectitem {
  id: number;
  name: string;
}

export default function ChipSelect({
  selected_values,
  options,
  label,
  onSelect,
  onDelete,
}: {
  selected_values?: chipselectitem[];
  options?: chipselectitem[];
  label: string;
  onSelect: (selected_id: number) => void;
  onDelete: (delete_id: number) => void;
}) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selected_values ?? []}
        onChange={(event: any) =>
          onSelect(event.target.value[event.target.value.length - 1])
        }
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((value, _) => (
              <Chip
                key={value.id}
                label={value.name}
                clickable
                deleteIcon={
                  <Cancel
                    onMouseDown={(event: any) => event.stopPropagation()}
                  />
                }
                onDelete={() => onDelete(value.id)}
              />
            ))}
          </Box>
        )}
      >
        {options?.map((option: chipselectitem) => (
          <MenuItem key={option.id} value={option.id}>
            {option.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
