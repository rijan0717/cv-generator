/**
 * Application entry point: connects to MongoDB, starts the HTTP (or HTTPS)
 * server and handles graceful shutdown.
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src -> server/
const serverRoot = path.resolve(__dirname, '..');

/**
 * Loads the TLS key and certificate named in the environment.
 *
 * Relative paths are resolved from the `server/` folder, so the default
 * `certs/localhost-key.pem` works wherever the process is started from.
 *
 * @returns {{key: Buffer, cert: Buffer}} The credentials for `https.createServer`.
 * @throws {Error} When either file is missing or unreadable, with a message
 *   telling the developer how to create them.
 */
function loadTlsCredentials() {
  const keyPath = path.resolve(serverRoot, env.https.keyPath);
  const certPath = path.resolve(serverRoot, env.https.certPath);

  for (const file of [keyPath, certPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `HTTPS is enabled but the certificate file was not found: ${file}\n` +
          'Generate a development certificate with: npm run certs:dev\n' +
          'Or set HTTPS_ENABLED=false in server/.env to go back to HTTP.',
      );
    }
  }

  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

/**
 * Creates the Node server that will carry the Express app: a plain HTTP server
 * normally, or a TLS one when the developer has enabled HTTPS.
 *
 * @param {import('express').Express} app - The configured Express application.
 * @returns {{server: import('node:http').Server, protocol: 'http'|'https'}}
 */
function createServer(app) {
  if (!env.https.enabled) {
    return { server: http.createServer(app), protocol: 'http' };
  }

  return { server: https.createServer(loadTlsCredentials(), app), protocol: 'https' };
}

/**
 * Connects to the database and starts listening for requests.
 * @returns {Promise<void>}
 */
async function start() {
  try {
    await connectDB(env.mongoUri);

    const app = createApp();
    const { server, protocol } = createServer(app);

    server.listen(env.port, () => {
      const base = `${protocol}://localhost:${env.port}`;
      console.log(`[server] running in ${env.nodeEnv} mode on ${base}`);
      console.log(`[server] health check: ${base}/api/health`);

      if (protocol === 'https' && env.https.allowSelfSigned) {
        console.log(
          '[server] using a self-signed certificate: your browser will warn once, which is expected in development',
        );
      }
    });

    /**
     * Closes the server and the database connection before exiting.
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
