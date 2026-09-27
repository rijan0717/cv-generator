/**
 * Application entry point: connects to MongoDB, starts the HTTP server and
 * handles graceful shutdown.
 */
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

/**
 * Connects to the database and starts listening for HTTP requests.
 * @returns {Promise<void>}
 */
async function start() {
  try {
    await connectDB(env.mongoUri);

    const app = createApp();
    const server = app.listen(env.port, () => {
      console.log(`[server] running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
      console.log(`[server] health check: http://localhost:${env.port}/api/health`);
    });

    /**
     * Closes the HTTP server and the database connection before exiting.
     * @param {string} signal - The OS signal that triggered the shutdown.
     */
    const shutdown = async (signal) => {
      console.log(`\n[server] ${signal} received, shutting down...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

start();
