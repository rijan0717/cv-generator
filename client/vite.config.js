import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Reads a boolean from the client environment file. Written in the same words
 * the server accepts (`true`, `1`, `yes`, `on`) so both `.env` files read the
 * same way.
 *
 * @param {string|undefined} value - Raw value from the environment.
 * @param {boolean} fallback - Used when the variable is not set.
 * @returns {boolean}
 */
function toBool(value, fallback) {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Builds the `server.https` option for Vite.
 *
 * Returns `undefined` when the developer has not enabled HTTPS, which leaves
 * the dev server on plain HTTP exactly as before. When it is enabled, the key
 * and certificate are read from disk; if either file is missing we stop with a
 * message saying how to create them rather than starting on the wrong
 * protocol.
 *
 * @param {Record<string, string>} envVars - Variables loaded from client/.env.
 * @param {string} rootDir - The client folder, used to resolve relative paths.
 * @returns {{key: Buffer, cert: Buffer}|undefined}
 */
function httpsOptions(envVars, rootDir) {
  if (!toBool(envVars.VITE_HTTPS_ENABLED, false)) return undefined;

  const keyPath = path.resolve(rootDir, envVars.VITE_HTTPS_KEY_PATH || '../certs/localhost-key.pem');
  const certPath = path.resolve(
    rootDir,
    envVars.VITE_HTTPS_CERT_PATH || '../certs/localhost-cert.pem',
  );

  for (const file of [keyPath, certPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `VITE_HTTPS_ENABLED is on but the certificate file was not found: ${file}\n` +
          'Generate a development certificate with: npm run certs:dev\n' +
          'Or set VITE_HTTPS_ENABLED=false in client/.env to go back to HTTP.',
      );
    }
  }

  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

export default defineConfig(({ mode }) => {
  const rootDir = process.cwd();
  // Vite only exposes VITE_* variables to the browser, but loadEnv lets this
  // config file read them while deciding how to start the dev server.
  const envVars = loadEnv(mode, rootDir, '');

  // Where /api and /uploads are forwarded. It becomes an https:// URL when the
  // Express server itself is running over TLS.
  const apiTarget = envVars.VITE_API_PROXY_TARGET || 'http://localhost:5000';

  const proxyOptions = {
    target: apiTarget,
    changeOrigin: true,
    // Accept the development certificate on the Express side; without this the
    // proxy would reject its own self-signed certificate.
    secure: toBool(envVars.VITE_API_PROXY_SECURE, false),
  };

  return {
    plugins: [react()],
    server: {
      port: Number(envVars.VITE_PORT || 5173),
      // undefined when HTTPS is off, so the default HTTP behaviour is unchanged.
      https: httpsOptions(envVars, rootDir),
      // Every request starting with /api is forwarded to the Express server, so
      // the client code can use relative URLs and the browser treats both as the
      // same origin during development.
      proxy: {
        '/api': proxyOptions,
        '/uploads': proxyOptions,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
