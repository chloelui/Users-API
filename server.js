import "dotenv/config";
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "users_api is running" });
});

app.use("/users", usersRouter);

// Send JSON 404 if nothing matched
app.use((req, res) => {
    res.status(404).json({ error: "Not found "});
});

// Errors thrown anywhere stored here
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image must be 2 MB or smaller." });
  }
  if (err.code === "23505") {
    return res.status(409).json({ error: "A user with that email already exists." });
  }
  if (err.code === "23503") {
    return res.status(404).json({ error: "That user doesn't exist." });
  }
  if (err.code === "23514") {
    return res.status(400).json({ error: "One of those values isn't allowed." });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});