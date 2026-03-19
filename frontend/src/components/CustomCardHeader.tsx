import React from "react";
import {
  CardHeader,
  CardHeaderProps,
  SvgIconProps,
  Box,
  Typography,
} from "@mui/material";

type CustomCardHeaderProps = Omit<CardHeaderProps, "title"> & {
  title?: React.ReactNode;
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
            alignItems: "center",
            gap: 1.25,
            color: "white",
            background: "#333",
            borderRadius: "5px",
            px: "14px",
            py: "10px",
            m: 0,
            fontWeight: 500,
            fontSize: "1.1rem",
          }}
        >
          {Icon && (
            <Icon
              sx={{
                fontSize: "1.3rem",
                flexShrink: 0,
              }}
            />
          )}
          <Typography
            component="span"
            variant="inherit"
            sx={{ flex: 1, lineHeight: 1.2, display: "flex", alignItems: "center" }}
          >
            {title}
          </Typography>
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
