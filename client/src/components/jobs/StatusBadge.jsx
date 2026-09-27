/**
 * The status of an application, as a coloured badge.
 *
 * Shared between the applicant's list and the employer's review screen so
 * the same word always looks the same on both sides.
 *
 * @param {{status: string}} props
 */
const STYLES = {
  submitted: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  reviewed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  shortlisted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  withdrawn: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? STYLES.reviewed;

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}
