import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  ListItemText,
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
  selected_ids,
  selected_values,
  options,
  label,
  onChange,
  onDelete,
}: {
  selected_ids?: number[];
  selected_values?: chipselectitem[];
  options?: chipselectitem[];
  label: string;
  onChange: (selected_ids: number[]) => void;
  onDelete: (delete_id: number) => void;
}) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selected_ids ?? []}
        onChange={(event: any) => onChange(event.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={() => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected_values?.map((value) => (
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
            <ListItemText primary={option.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
