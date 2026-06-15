import express from "express";
import cors from "cors";
import scrapRoutes from "./routes/scrapRoutes";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/scraps', scrapRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

