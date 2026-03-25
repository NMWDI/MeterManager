import { ToggleButton, ToggleButtonProps } from "@mui/material";

const defaultToggleStyle = {
  "&.Mui-selected": { borderColor: "blue", border: 1 },
};

export const StyledToggleButton = (props: ToggleButtonProps) => {
  const {
    children,
    value = "check",
    color = "primary",
    fullWidth = true,
    sx,
    ...rest
  } = props;

  return (
    <ToggleButton
      value={value}
      color={color}
      fullWidth={fullWidth}
      sx={{ ...defaultToggleStyle, ...sx }}
      {...rest}
    >
      {children}
    </ToggleButton>
  );
}
