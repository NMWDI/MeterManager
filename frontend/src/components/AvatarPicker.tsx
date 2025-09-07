import { useState, useEffect } from "react";
import { Grid, Box, Card, CardActionArea, Button, Typography } from "@mui/material";
import { createAvatar } from "@dicebear/core";
import { identicon } from "@dicebear/collection";

type AvatarPickerProps = {
  onSelect: (avatar: string) => void; // returns selected avatar as data URI
  initialSeed?: string;
};

export default function AvatarPicker({ onSelect, initialSeed }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const generateAvatars = () => {
    const batch = Array.from({ length: 12 }, () => {
      const seed = Math.random().toString(36).substring(2, 10); // random seed
      return createAvatar(identicon, {
        size: 64,
        seed,
      }).toDataUri();
    });
    setAvatars(batch);
    setSelected(null); // reset selection when new batch generated
  };

  // Generate initial batch on mount
  useEffect(() => {
    generateAvatars();
  }, []);

  // If initialSeed provided, generate that avatar as the selected one
  useEffect(() => {
    if (initialSeed) {
      const avatar = createAvatar(identicon, {
        size: 64,
        seed: initialSeed,
      }).toDataUri();
      setSelected(avatar);
    }
  }, [initialSeed]);

  const handleSelect = (avatar: string) => {
    setSelected(avatar);
    onSelect(avatar);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Choose Your Avatar
      </Typography>
      <Grid container spacing={2}>
        {avatars.map((avatar, i) => (
          <Grid item xs={6} sm={3} md={2} key={i}>
            <Card
              sx={{
                outline: selected === avatar ? "3px solid blue" : "1px solid #ddd",
                borderRadius: 2,
              }}
            >
              <CardActionArea onClick={() => handleSelect(avatar)}>
                <Box
                  component="img"
                  src={avatar}
                  alt={`avatar-${i}`}
                  sx={{
                    width: "100%",
                    height: 64,
                    objectFit: "scale-down",
                    pt: 1,
                    pb: 0.625,
                  }}
                />
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Button variant="outlined" onClick={generateAvatars}>
          Generate New Avatars
        </Button>
      </Box>
    </Box>
  );
}
