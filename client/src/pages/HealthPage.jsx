import { useEffect, useState } from 'react';
import { getHealth } from '../api/health.js';

/**
 * Phase 0 landing page. It proves the full stack is wired up: React calls the
 * Express API through the Vite proxy, and Express reports its MongoDB state.
 */
export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Smart CV Generator</h1>
        <p className="mt-1 text-sm text-slate-500">Phase 0 &mdash; project setup</p>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-medium text-slate-700">Backend status</h2>

          {loading && <p className="mt-2 text-sm text-slate-500">Checking&hellip;</p>}

          {error && (
            <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              Could not reach the API: {error}
            </p>
          )}

          {health && (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Server</dt>
                <dd className="font-medium text-emerald-600">{health.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Database</dt>
                <dd
                  className={
                    health.database === 'connected'
                      ? 'font-medium text-emerald-600'
                      : 'font-medium text-amber-600'
                  }
                >
                  {health.database}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Uptime</dt>
                <dd className="font-medium text-slate-900">{health.uptimeSeconds}s</dd>
              </div>
            </dl>
          )}
        </div>
      </section>
    </main>
  );
}
