import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import Pagination from '../../components/admin/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * The user list: search, status filter, pagination, and the block, unblock
 * and delete actions.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await adminApi.listUsers({
        page,
        search: search || undefined,
        status: status || undefined,
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Blocks or unblocks an account, then refreshes the row.
   * @param {object} user - The user being changed.
   */
  async function toggleStatus(user) {
    setBusyId(user.id);
    setError('');

    try {
      const next = user.status === 'blocked' ? 'active' : 'blocked';
      const updated = await adminApi.setUserStatus(user.id, next);
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Soft-deletes a user after confirming.
   * @param {object} user - The user being removed.
   */
  async function remove(user) {
    if (!window.confirm(`Delete ${user.email}? Their CVs stay in the database for reporting.`)) {
      return;
    }

    setBusyId(user.id);
    setError('');

    try {
      await adminApi.deleteUser(user.id);
      setUsers((current) => current.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Filters. Changing one resets to page 1, or the user could end up on
          a page that no longer exists in the filtered results. */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="user-search" className="block text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            id="user-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Name or email"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label htmlFor="user-status" className="block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="user-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500">
          <Spinner label="Loading users" />
        </div>
      ) : users.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No users match those filters.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  User
                </th>
                <th scope="col" className="px-4 py-3">
                  Role
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  CVs
                </th>
                <th scope="col" className="px-4 py-3">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3">
                  Last login
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {user.name}
                    </Link>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>

                  <td className="px-4 py-3">
                    {user.role === 'admin' ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                        admin
                      </span>
                    ) : (
                      <span className="text-slate-600">user</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        user.status === 'blocked'
                          ? 'rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700'
                          : 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700'
                      }
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-700">{user.cvCount}</td>

                  <td className="px-4 py-3 text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('en-GB')}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('en-GB')
                      : 'Never'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={busyId === user.id}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === 'blocked' ? 'Unblock' : 'Block'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(user)}>
                        Delete
                      </Button>
                    </div>
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
