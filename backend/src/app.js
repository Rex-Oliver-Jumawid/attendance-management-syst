const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Import Routes
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const moderatorRoutes = require("./routes/moderator.routes");
const userRoutes = require("./routes/user.routes");
const massScheduleRoutes = require("./routes/massSchedule.routes");

// API Routes (MUST COME BEFORE STATIC FILES)
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use("/api/user", userRoutes);
app.use("/api/mass-schedules", massScheduleRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Church Attendance System API is running",
    timestamp: new Date(),
  });
});

// Serve static files from the parent directory (frontend)
// This must come AFTER API routes
app.use(express.static(path.join(__dirname, "../../")));

// Serve index.html for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../html/login.html"));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
