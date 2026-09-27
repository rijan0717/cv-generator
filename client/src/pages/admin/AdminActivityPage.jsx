import { useState, useEffect, useCallback } from 'react';
import * as adminApi from '../../api/admin.js';
import Pagination from '../../components/admin/Pagination.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The actions that can be filtered on, matching the ActivityLog enum. */
const ACTIONS = [
  'REGISTER',
  'LOGIN',
  'CV_CREATE',
  'CV_UPDATE',
  'CV_DELETE',
  'DOWNLOAD_PDF',
  'DOWNLOAD_DOCX',
  'DOWNLOAD_EXCEL',
  'CV_IMPORT',
  'JOB_MATCH',
  'ADMIN_ACTION',
];

/** The paginated audit trail. */
export default function AdminActivityPage() {
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await adminApi.listActivity({ page, action: action || undefined });
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label htmlFor="activity-action" className="block text-sm font-medium text-slate-700">
          Action
        </label>
        <select
          id="activity-action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500">
          <Spinner label="Loading activity" />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Nothing recorded for that filter.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  When
                </th>
                <th scope="col" className="px-4 py-3">
                  User
                </th>
                <th scope="col" className="px-4 py-3">
                  Action
                </th>
                <th scope="col" className="px-4 py-3">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {new Date(entry.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="px-4 py-2.5">
                    {entry.user ? (
                      <span className="text-slate-700">{entry.user.email}</span>
                    ) : (
                      <span className="text-slate-400">Deleted user</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-slate-700">{entry.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {entry.meta && Object.keys(entry.meta).length > 0
                      ? JSON.stringify(entry.meta)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination pagination={pagination} onChange={setPage} />
    </div>
  );
}
