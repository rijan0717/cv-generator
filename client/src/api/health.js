import api from './axios.js';

/**
 * Calls GET /api/health and returns the server's health payload.
 * @returns {Promise<{status: string, uptimeSeconds: number, database: string, timestamp: string}>}
 */
export async function getHealth() {
  const { data } = await api.get('/api/health');
  return data.data;
}
