import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo"; 
import mongoose from "mongoose";         
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Create MongoDB session
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/sessions",
  dbName: process.env.MONGODB_DB_NAME || "myapp",
  collectionName: "sessions",
  ttl: 30 * 24 * 60 * 60, 
  autoRemove: 'native', 
  crypto: {
    secret: process.env.SESSION_ENCRYPTION_SECRET || 'fallback-encryption-secret'
  }
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

let isMongoConnected = false;

async function connectToDatabase() {
  try {
    if (!isMongoConnected) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/myapp",
        {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        }
      );
      isMongoConnected = true;
      log("Connected to MongoDB");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Connect to MongoDB before starting the server
  await connectToDatabase();
  
  const server = await registerRoutes(app);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`MongoDB session store configured`);
    log(`Database: ${process.env.MONGODB_URI || "mongodb://localhost:27017/sessions"}`);
  });
})();
