import { Link } from 'react-router-dom';
import CompanyLogo from '../company/CompanyLogo.jsx';

/**
 * One job in a list.
 *
 * Shared between the public board and the saved-jobs page so a job looks
 * the same wherever it appears.
 *
 * @param {{job: object, onToggleSave?: (job: object) => void,
 *          isSaving?: boolean, showSave?: boolean,
 *          match?: {matchScore: number, band: string}|null}} props
 */
export default function JobCard({
  job,
  onToggleSave,
  isSaving = false,
  showSave = true,
  match = null,
}) {
  const closingSoon =
    job.closingDate && new Date(job.closingDate) - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <article className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {/* Who is hiring, before the name is read. */}
          <CompanyLogo company={job.company} size="sm" />

          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {/*
              `after:absolute after:inset-0` stretches an invisible layer
              from this link across the whole card, so a click anywhere on
              it opens the job — not just on the title.

              It is done this way rather than by putting an onClick on the
              article because the link stays a real link: it is reachable
              by keyboard, it reads as one link to a screen reader, and
              "open in new tab" still works. The one rule it imposes is
              that anything else clickable in the card must sit above the
              layer, which is what the `relative z-10` below is for.
            */}
              <Link
                to={`/jobs/${job._id}`}
                className="after:absolute after:inset-0 after:rounded-xl hover:underline"
              >
                {job.title}
              </Link>
            </h3>

            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {job.company?.name ?? 'A company'}
              {job.location && <> &middot; {job.location}</>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* A 0 is a score like any other, so this tests for the object, not the number. */}
          {match != null && <MatchBadge matchScore={match.matchScore} band={match.band} />}

          {showSave && onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(job)}
              disabled={isSaving}
              aria-pressed={Boolean(job.isSaved)}
              aria-label={job.isSaved ? 'Remove from saved jobs' : 'Save this job'}
              // Above the stretched link, or saving would open the job instead.
              className="relative z-10 shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
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
 * How well this job matches the user's primary CV.
 *
 * The colour carries the same meaning as the number, but colour alone is
 * never the only signal — the percentage and the band are both written
 * out, so the badge still reads correctly to anyone who cannot
 * distinguish the shades.
 *
 * Every scored job gets a badge, including one that scores 0. A job the
 * CV does not match at all is a real answer, and the whole point of the
 * board is being able to tell it apart from a job that does.
 *
 * @param {{matchScore: number, band: string}} props
 */
function MatchBadge({ matchScore, band }) {
  const tone =
    matchScore >= 65
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900'
      : matchScore >= 50
        ? 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900'
        : matchScore >= 30
          ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900'
          : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}
      title={`${band} — scored against your primary CV`}
    >
      AI match ({matchScore}%)
    </span>
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
