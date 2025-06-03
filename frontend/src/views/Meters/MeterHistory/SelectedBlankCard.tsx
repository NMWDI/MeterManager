import { Grid, Card, CardContent } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

// A blank card to display when no history item is selected
export const SelectedBlankCard = () => {
  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader title="Selected Details" icon={InfoOutlinedIcon} />
      <CardContent>
        <Grid container item xs={10}>
          Select a history item to view details
        </Grid>
      </CardContent>
    </Card>
  );
};
