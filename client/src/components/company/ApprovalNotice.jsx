import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';

/**
 * What an employer sees instead of a page their company is not approved
 * for yet — the candidate directory, their posts, and anything added
 * later that waits on the same approval.
 *
 * One component for all of them on purpose: an employer who meets this
 * wall twice should read the same explanation both times, rather than a
 * full page in one place and a single grey line in another, which looks
 * like two different problems.
 *
 * It is a page rather than a red error bar because it is not an error:
 * the employer has done nothing wrong, the admin simply has not checked
 * their company yet. The first line is specific — waiting, rejected, or
 * no company at all — and comes from the server wherever the server
 * knows it, so there is one wording to maintain.
 *
 * @param {{message: string, detail?: string}} props - `message` is the
 *   reason; `detail` is an optional line about the page in particular.
 */
export default function ApprovalNotice({ message, detail }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-900"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </span>

      <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        You cannot use this page yet
      </h1>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{message}</p>

      {detail && (
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-500">{detail}</p>
      )}

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-500">
        You will be able to use this page as soon as an admin approves your company.
      </p>

      <Link to="/company" className="mt-6 inline-block">
        <Button variant="secondary">Go to my company</Button>
      </Link>
    </div>
  );
}
