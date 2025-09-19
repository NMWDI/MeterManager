import { useState, useEffect } from "react";
import { Grid, Box, Card, CardActionArea, Button, Typography } from "@mui/material";
import { createAvatar } from "@dicebear/core";
import { loreleiNeutral, initials } from "@dicebear/collection";

type AvatarPickerProps = {
  onSelect: (avatar: string) => void;
  initialSeed?: string;
  display_name: string;
};

export default function AvatarPicker({
  onSelect,
  initialSeed,
  display_name,
}: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const generateAvatars = () => {
    // Lorelei batch: random seed
    const batchLorelei = Array.from({ length: 10 }, () => {
      const seed = Math.random().toString(36).substring(2, 10);
      return createAvatar(loreleiNeutral, {
        size: 64,
        seed,
      }).toDataUri();
    });

    // Initials batch: always use display_name, but vary style
    const batchInitials = Array.from({ length: 2 }, () => {
      const size = 64 + Math.floor(Math.random() * 20) - 10; // vary ±10
      const bgColors = [
        // Greys (dark enough for white contrast)
        "424242", "616161", "757575", "546e7a", "455a64",

        // Blues (pair with pink secondary)
        "1565c0", "1976d2", "1e88e5", "283593", "303f9f",

        // Teals & Cyans
        "00838f", "0097a7", "00695c", "00796b",

        // Greens
        "2e7d32", "388e3c", "43a047", "1b5e20",

        // Yellows & Ambers (pick deeper tones so white is readable)
        "f57f17", "f9a825", "ff8f00", "ff6f00",

        // Oranges
        "e65100", "ef6c00", "f4511e", "d84315",

        // Reds / Pinks (echo secondary)
        "ad1457", "c2185b", "d81b60", "b71c1c", "c62828",

        // Purples (complement to indigo)
        "6a1b9a", "7b1fa2", "8e24aa", "512da8", "5e35b1",

        // Indigo (close to primary but a bit varied)
        "283593", "3949ab", "303f9f"
      ];
      const backgroundColor =
        bgColors[Math.floor(Math.random() * bgColors.length)];

      return createAvatar(initials, {
        size,
        seed: display_name, // 👈 initials come from display_name
        backgroundColor: [backgroundColor],
      }).toDataUri();
    });

    // Shuffle them together for variety
    const mixed = [...batchLorelei, ...batchInitials].sort(() => Math.random() - 0.5);

    setAvatars(mixed);
    setSelected(null);
  };

  // Generate initial batch on mount
  useEffect(() => {
    generateAvatars();
  }, []);

  // If initialSeed provided, generate that avatar as the selected one
  useEffect(() => {
    if (initialSeed) {
      const avatar = createAvatar(loreleiNeutral, {
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
                outline:
                  selected === avatar ? "3px solid blue" : "1px solid #ddd",
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
                    objectFit: "contain",
                    bgcolor: "white", // ensures background is filled
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
