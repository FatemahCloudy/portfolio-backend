import 'dotenv/config';
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import cors from "cors"; 
import { registerRoutes } from "./routes.js";
import { log } from "./vite.js";

const app = express();

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Your frontend URL
  credentials: true, // Allow cookies/session
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session config
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || "myapp",
  collectionName: "sessions",
  ttl: 30 * 24 * 60 * 60,
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      sameSite: "none",
    },
  })
);

// Trust proxy for Render
app.set("trust proxy", 1);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Logging middleware
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

// Register routes
await registerRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  log(`Backend server running on port ${PORT}`);
  log(`CORS allowed origin: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
});
