import { Link } from 'react-router-dom';

/**
 * One job in a list.
 *
 * Shared between the public board and the saved-jobs page so a job looks
 * the same wherever it appears.
 *
 * @param {{job: object, onToggleSave?: (job: object) => void,
 *          isSaving?: boolean, showSave?: boolean}} props
 */
export default function JobCard({ job, onToggleSave, isSaving = false, showSave = true }) {
  const closingSoon =
    job.closingDate && new Date(job.closingDate) - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            <Link to={`/jobs/${job._id}`} className="hover:underline">
              {job.title}
            </Link>
          </h3>

          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            {job.company?.name ?? 'A company'}
            {job.location && <> &middot; {job.location}</>}
          </p>
        </div>

        {showSave && onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            disabled={isSaving}
            aria-pressed={Boolean(job.isSaved)}
            aria-label={job.isSaved ? 'Remove from saved jobs' : 'Save this job'}
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill={job.isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path strokeLinejoin="round" d="M6 3h12v18l-6-4-6 4z" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Tag>{job.jobType}</Tag>
        <Tag>{job.workMode}</Tag>
        {job.salaryRange && <Tag>{job.salaryRange}</Tag>}
      </div>

      {job.skills?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 6).map((skill) => (
            <li
              key={skill}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {skill}
            </li>
          ))}
          {job.skills.length > 6 && (
            <li className="px-1 text-xs text-slate-500 dark:text-slate-400">
              +{job.skills.length - 6} more
            </li>
          )}
        </ul>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Posted {new Date(job.createdAt).toLocaleDateString('en-GB')}</span>

        {typeof job.applicationCount === 'number' && (
          <span>
            &middot; {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
          </span>
        )}

        {closingSoon && (
          <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Closes {new Date(job.closingDate).toLocaleDateString('en-GB')}
          </span>
        )}

        {job.hasApplied && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Applied
          </span>
        )}
      </footer>
    </article>
  );
}

/**
 * A small neutral tag.
 * @param {{children: React.ReactNode}} props
 */
function Tag({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}
