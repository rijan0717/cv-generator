import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import { TEMPLATES, getTemplate } from '../../templates/index.js';
import Pagination from '../../components/admin/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** Every CV in the system, with its owner, filterable by title and template. */
export default function AdminCVsPage() {
  const [cvs, setCvs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await adminApi.listAllCVs({
        page,
        search: search || undefined,
        templateKey: templateKey || undefined,
      });
      setCvs(data.cvs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, templateKey]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Removes a CV after confirming.
   * @param {object} cv - The CV to remove.
   */
  async function remove(cv) {
    if (!window.confirm(`Delete "${cv.title}"? The owner will no longer see it.`)) return;

    setBusyId(cv._id);
    setError('');

    try {
      await adminApi.deleteAnyCV(cv._id);
      setCvs((current) => current.filter((item) => item._id !== cv._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="cv-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Search by title
          </label>
          <input
            id="cv-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="cv-template"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Template
          </label>
          <select
            id="cv-template"
            value={templateKey}
            onChange={(e) => {
              setTemplateKey(e.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-slate-300 dark:ring-slate-600 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
          >
            <option value="">All</option>
            {TEMPLATES.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading CVs" />
        </div>
      ) : cvs.length === 0 ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No CVs match those filters.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Owner
                </th>
                <th scope="col" className="px-4 py-3">
                  Template
                </th>
                <th scope="col" className="px-4 py-3">
                  Score
                </th>
                <th scope="col" className="px-4 py-3">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cvs.map((cv) => (
                <tr key={cv._id}>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/cvs/${cv._id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {cv.title}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    {cv.user ? (
                      <>
                        <div className="text-slate-900 dark:text-slate-100">{cv.user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {cv.user.email}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Unknown</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {getTemplate(cv.templateKey).name}
                  </td>

                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {cv.strengthScore ? `${cv.strengthScore}/100` : '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(cv.updatedAt).toLocaleDateString('en-GB')}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/cvs/${cv._id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        isLoading={busyId === cv._id}
                        onClick={() => remove(cv)}
                      >
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
