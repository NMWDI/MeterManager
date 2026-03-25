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
  subheader,
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
            background: "#333",
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
      subheader={
        subheader && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              px: 2,
              py: 0.5,
              m: 0,
              fontWeight: 500,
              fontSize: "1.1rem",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {subheader}
            </Typography>
          </Box>
        )
      }
      sx={{
        mb: 0,
        p: 0,
        ...sx,
      }}
      {...rest}
    />
  );
};
