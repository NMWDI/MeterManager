import { Card, CardContent, SvgIcon } from "@mui/material";
import { CustomCardHeader } from "@/components";

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof SvgIcon;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: "fit-content" }}>
      <CustomCardHeader title={title} subheader={description} icon={Icon} />
      <CardContent sx={{ p: { xs: 1, md: 2 } }}>{children}</CardContent>
    </Card>
  );
}
