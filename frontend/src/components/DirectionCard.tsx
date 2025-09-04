import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { StatCell } from './StatCell'

export const DirectionCard = ({
  title,
  min,
  avg,
  max,
}: {
  title: string;
  min?: number;
  avg?: number;
  max?: number;
}) => {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <StatCell label="Min" value={min} />
          <StatCell label="Avg" value={avg} />
          <StatCell label="Max" value={max} />
        </Stack>
      </CardContent>
    </Card>
  );
}
