import { useState, useEffect, useCallback, useRef } from 'react';
import * as adminApi from '../../api/admin.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { readBlobError } from '../../utils/blobError.js';

/** The reports on offer, in the order the tabs show them. */
const REPORTS = [
  { type: 'users', label: 'Users' },
  { type: 'cvs', label: 'CV generation' },
  { type: 'downloads', label: 'Downloads' },
  { type: 'templates', label: 'Template usage' },
  { type: 'job-matches', label: 'Job match & skill gap' },
];

/** How many rows are shown on screen before the list is cut off. */
const PREVIEW_ROWS = 50;

/**
 * Admin reports: pick a report and a date range, read it on screen, then
 * export it as Excel or PDF.
 *
 * The preview and the two exports all come from one endpoint, so the
 * figures on screen are the figures in the file. Showing one aggregation
 * and exporting another is the classic way a reporting screen starts
 * lying, and it is avoided here by construction rather than by care.
 */
export default function AdminReportsPage() {
  const [type, setType] = useState('users');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  // Which request is current. A slow report for one tab must not land
  // after a fast one for another and overwrite it.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setIsLoading(true);
    setError('');

    try {
      const result = await adminApi.getReport(type, {
        from: from || undefined,
        to: to || undefined,
      });
      if (requestRef.current === requestId) setReport(result);
    } catch (err) {
      if (requestRef.current === requestId) {
        setError(err.message);
        setReport(null);
      }
    } finally {
      if (requestRef.current === requestId) setIsLoading(false);
    }
  }, [type, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Exports the report currently on screen.
   * @param {'xlsx'|'pdf'} format - Which file to produce.
   */
  async function download(format) {
    setDownloading(format);
    setError('');

    try {
      await adminApi.downloadReport(type, {
        from: from || undefined,
        to: to || undefined,
        format,
      });
    } catch (err) {
      setError(await readBlobError(err));
    } finally {
      setDownloading('');
    }
  }

  /** Clears the date range back to "all time". */
  function clearRange() {
    setFrom('');
    setTo('');
  }

  const rows = report?.rows ?? [];
  const shown = rows.slice(0, PREVIEW_ROWS);

  return (
    <div>
      {/* Report chooser */}
      <div
        role="tablist"
        aria-label="Report"
        className="flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
      >
        {REPORTS.map((entry) => (
          <button
            key={entry.type}
            type="button"
            role="tab"
            aria-selected={type === entry.type}
            onClick={() => setType(entry.type)}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              type === entry.type
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Date range and exports */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div>
          <label
            htmlFor="report-from"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            From
          </label>
          <input
            id="report-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="report-to"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            To
          </label>
          <input
            id="report-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </div>

        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={clearRange}>
            Clear dates
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={downloading === 'xlsx'}
            onClick={() => download('xlsx')}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={downloading === 'pdf'}
            onClick={() => download('pdf')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {/* The report itself.

          While a new report loads, the previous one stays on screen under
          a dimming class rather than being replaced by a spinner. Swapping
          a full table for a spinner and back on every date change is the
          flicker that makes a reporting screen feel unstable, and the old
          figures are never mistaken for the new ones because the panel is
          visibly inactive while they are stale. */}
      {!report && isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Building the report" />
        </div>
      ) : report ? (
        <div
          aria-busy={isLoading}
          className={`transition-opacity duration-150 ${isLoading ? 'pointer-events-none opacity-50' : 'opacity-100'}`}
        >
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{report.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {report.range} &middot; {rows.length} row{rows.length === 1 ? '' : 's'}
            </p>
          </div>

          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.summary.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
              >
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
              No data in this date range.
            </p>
          ) : (
            <>
              <ReportTable columns={report.columns} rows={shown} />
              {rows.length > shown.length && (
                <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  Showing the first {PREVIEW_ROWS} of {rows.length} rows. Export the report for all
                  of them.
                </p>
              )}
            </>
          )}

          {report.extraTable && report.extraTable.rows.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-slate-900 dark:text-slate-100">
                {report.extraTable.title}
              </h3>
              <ReportTable
                columns={report.extraTable.columns}
                rows={report.extraTable.rows}
                className="mt-2"
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One table of a report. The server decides the columns, so the same
 * component renders every report without knowing anything about them.
 *
 * @param {{columns: Array<{header: string, key: string}>,
 *          rows: Array<object>, className?: string}} props
 */
function ReportTable({ columns, rows, className = 'mt-4' }) {
  return (
    <div
      className={`${className} overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700`}
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, index) => (
            // Report rows are a flat projection with no id of their own,
            // and the list is never reordered or edited in place, so the
            // index is a stable key here.
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
