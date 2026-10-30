import { useState, useEffect, useCallback } from 'react';
import * as adminApi from '../../api/admin.js';
import { useToast } from '../../context/useToast.js';
import { documentUrl } from '../../api/companies.js';
import Pagination from '../../components/ui/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/** The review states, as tabs. */
const TABS = [
  { status: 'pending', label: 'Pending approval' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
];

/**
 * Company review: every company an employer registers waits here until the
 * admin approves or rejects it. Only approved companies can post jobs.
 *
 * Pending companies are listed oldest first, so the queue is worked in
 * the order it arrived.
 */
export default function AdminCompaniesPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [companies, setCompanies] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await adminApi.listCompanies({
        status,
        page,
        search: search.trim() || undefined,
      });
      setCompanies(data.companies);
      setCounts(data.counts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Records a decision, then reloads so the company moves to its new tab
   * and the counts update.
   * @param {object} company
   * @param {'approved'|'rejected'} decision
   * @param {string} [reason]
   */
  async function decide(company, decision, reason) {
    await adminApi.reviewCompany(company._id, decision, reason);
    toast.success(`${company.name} ${decision === 'approved' ? 'approved' : 'rejected'}.`);
    await load();
  }

  return (
    <div>
      <nav className="flex flex-wrap gap-2" aria-label="Company status">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            aria-pressed={status === tab.status}
            onClick={() => {
              setStatus(tab.status);
              setPage(1);
            }}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              status === tab.status
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {tab.label}{' '}
            <span
              className={
                tab.status === 'pending' && counts.pending > 0
                  ? 'ml-1 rounded-full bg-amber-500 px-1.5 text-xs text-white'
                  : 'ml-1 text-xs opacity-70'
              }
            >
              {counts[tab.status] ?? 0}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-4">
        <label htmlFor="company-search" className="sr-only">
          Search companies
        </label>
        <input
          id="company-search"
          type="search"
          value={search}
          placeholder="Search by name, registration number or location"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-md rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
        />
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading companies" />
        </div>
      ) : companies.length === 0 ? (
        <p className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          {status === 'pending' ? 'No companies are waiting for approval.' : 'No companies here.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {companies.map((company) => (
            <CompanyReviewCard
              key={company._id}
              company={company}
              onDecide={(decision, reason) =>
                decide(company, decision, reason).catch((err) => toast.error(err.message))
              }
            />
          ))}
        </ul>
      )}

      <Pagination pagination={pagination} onChange={setPage} label="companies" />
    </div>
  );
}

/**
 * One company with everything the admin checks, and the decision buttons
 * for its current state. Rejecting opens a box for the reason, which the
 * employer will see.
 *
 * @param {{company: object, onDecide: (decision: string, reason?: string) => Promise<void>}} props
 */
function CompanyReviewCard({ company, onDecide }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  /** Runs one decision with a busy state on its button. */
  async function run(decision, why) {
    setBusy(decision);
    try {
      await onDecide(decision, why);
    } finally {
      setBusy('');
    }
  }

  const details = [
    ['Registration / PAN / VAT', company.registrationNumber],
    ['Location', company.location],
    ['Phone', company.phone],
    ['Email', company.email],
    ['Industry', company.industry],
    ['Website', company.website],
  ];

  return (
    <li className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {company.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registered by {company.owner?.name ?? 'a deleted user'}
            {company.owner?.email ? ` (${company.owner.email})` : ''} · submitted{' '}
            {new Date(company.submittedAt ?? company.createdAt).toLocaleDateString('en-GB')}
          </p>
        </div>

        {company.hasDocument ? (
          <a
            href={documentUrl(company._id)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-900 dark:hover:bg-indigo-950"
          >
            View registration document
          </a>
        ) : (
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            No document uploaded
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
            </dt>
            <dd className="text-slate-800 dark:text-slate-200">{value || '—'}</dd>
          </div>
        ))}
      </dl>

      {company.description && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{company.description}</p>
      )}

      {company.status === 'rejected' && company.rejectionReason && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Rejected: “{company.rejectionReason}”
        </p>
      )}

      {isRejecting ? (
        <div className="mt-4">
          <label
            htmlFor={`reason-${company._id}`}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Reason for rejecting (the employer will see this)
          </label>
          <textarea
            id={`reason-${company._id}`}
            value={reason}
            rows={2}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={reason.trim().length < 5}
              isLoading={busy === 'rejected'}
              onClick={() => run('rejected', reason)}
            >
              Confirm rejection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {company.status !== 'approved' && (
            <Button
              size="sm"
              disabled={!company.hasDocument}
              title={company.hasDocument ? undefined : 'Needs a registration document first'}
              isLoading={busy === 'approved'}
              onClick={() => run('approved')}
            >
              Approve
            </Button>
          )}
          {company.status !== 'rejected' && (
            <Button size="sm" variant="secondary" onClick={() => setIsRejecting(true)}>
              {company.status === 'approved' ? 'Revoke approval' : 'Reject'}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
