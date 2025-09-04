import React from "react";
import {
  CardHeader,
  CardHeaderProps,
  SvgIconProps,
  Box,
  Typography,
} from "@mui/material";

type CustomCardHeaderProps = Omit<CardHeaderProps, "title"> & {
  title?: string;
  icon?: React.ComponentType<SvgIconProps>;
};

export const CustomCardHeader: React.FC<CustomCardHeaderProps> = ({
  title,
  icon: Icon = null,
  sx,
  ...rest
}) => {
  return (
    <CardHeader
      title={
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            color: "white",
            background: "#292929",
            borderRadius: "5px",
            px: "14px",
            py: "10px",
            m: 0,
            fontWeight: 500,
            fontSize: "1.1rem",
          }}
        >
          <Typography component="span" variant="inherit" sx={{ flex: 1 }}>
            {title}
          </Typography>
          {Icon && (
            <Icon
              sx={{
                fontSize: "1.3rem",
                pb: 0,
                mr: "10px",
              }}
            />
          )}
        </Box>
      }
      sx={{
        mb: 0,
        pb: 0,
        ...sx,
      }}
      {...rest}
    />
  );
};
