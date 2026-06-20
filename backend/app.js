const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const apiRoutes = require("./routes/apiRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL
  ].filter(Boolean), 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "API Tester Backend is running" });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });


module.exports = app;