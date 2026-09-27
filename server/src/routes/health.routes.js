import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/** Human-readable names for Mongoose's numeric connection states. */
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * GET /api/health
 * Simple liveness check used during development and in the deployment demo.
 * Reports server uptime and the current database connection state.
 */
router.get('/', (req, res) => {
  sendSuccess(
    res,
    {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    },
    'Server is healthy',
  );
});

export default router;
