import express from "express";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();
app.use(express.json());

app.use("/api/v1", routes);

app.use(errorMiddleware);

export default app;