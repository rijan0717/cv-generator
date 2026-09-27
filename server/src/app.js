/**
 * Builds and configures the Express application.
 *
 * The app is exported without starting a server so that tests (Supertest) can
 * import it directly, while `server.js` is responsible for connecting to
 * MongoDB and listening on a port.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env, isProduction, isTest } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a fully configured Express application.
 * @returns {import('express').Express} The Express app.
 */
export function createApp() {
  const app = express();

  // Trust the first proxy so req.ip is correct behind a reverse proxy.
  app.set('trust proxy', 1);

  // --- Security and infrastructure middleware -----------------------------
  app.use(
    helmet({
      // Uploaded images are served from this origin but displayed by the
      // client on a different port during development.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true, // required so the browser sends the auth cookie
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!isTest) {
    app.use(morgan(isProduction ? 'combined' : 'dev'));
  }

  // --- Static files --------------------------------------------------------
  // Uploaded avatars and CV photos are stored on local disk (no third-party
  // storage) and served read-only from /uploads.
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  // --- API routes ----------------------------------------------------------
  app.use('/api', apiRoutes);

  // --- Error handling (must be registered last) ----------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
