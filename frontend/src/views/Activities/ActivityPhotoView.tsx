import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Card, CardContent, Skeleton, Box, Alert } from "@mui/material";
import { Image } from "@mui/icons-material";
import { API_URL } from "@/config";
import { BackgroundBox, CustomCardHeader } from "@/components";

export const ActivityPhotoView = () => {
  const { activity_id, photo_file_name } = useParams({
    from: "/activities/$activity_id/photos/$photo_file_name",
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  const src = useMemo(() => {
    if (!activity_id || !photo_file_name) return undefined;
    return `${API_URL}/activities/${activity_id}/photos/${encodeURIComponent(
      photo_file_name,
    )}`;
  }, [activity_id, photo_file_name]);

  if (!src) {
    return (
      <BackgroundBox>
        <Card sx={{ height: "fit-content" }}>
          <CustomCardHeader title="Meter Activity Photo" icon={Image} />
          <CardContent>
            <Alert severity="warning">Missing photo parameters.</Alert>
          </CardContent>
        </Card>
      </BackgroundBox>
    );
  }

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Meter Activity Photo" icon={Image} />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              width: "100%",
              maxWidth: 900,
              mx: "auto",
            }}
          >
            {/* Reserve space to prevent layout jump */}
            {!loaded && !error && (
              <Skeleton
                variant="rectangular"
                width="100%"
                height={600}
                sx={{ aspectRatio: "4 / 3", borderRadius: 1 }}
              />
            )}

            <Box
              component="img"
              src={src}
              alt={photo_file_name ?? "Activity"}
              loading="eager"
              onLoad={() => setLoaded(true)}
              onError={() => {
                setError("Failed to load photo.");
                setLoaded(false);
              }}
              sx={{
                display: loaded && !error ? "block" : "none",
                width: "100%",
                height: "auto",
                borderRadius: 1,
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
