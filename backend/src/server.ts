
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB before starting the API.
    await connectDatabase();

    app.listen(env.PORT, () => {
      console.log(`Restaurant POS API running at http://localhost:${env.PORT}`);
      console.log(`Health endpoint: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    console.error("Server startup failed:", message);
    process.exit(1);
  }
}

void startServer();
