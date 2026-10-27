/**
 * The company's review status, shown at the top of the employer's pages.
 *
 *   - pending:  a one-line reminder that jobs can be posted after approval.
 *   - rejected: the admin's reason, and how to resubmit.
 *   - approved: a small confirmation; nothing else is needed.
 *
 * @param {{company: object}} props
 */
export default function CompanyStatusBanner({ company }) {
  if (!company) return null;

  if (company.status === 'approved') {
    return (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <span aria-hidden="true">✓</span> Approved — you can post jobs
      </p>
    );
  }

  if (company.status === 'rejected') {
    return (
      <div
        role="alert"
        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
      >
        <p className="font-semibold text-red-800 dark:text-red-200">
          Your company was not approved
        </p>
        {company.rejectionReason && (
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            Reason from the admin: “{company.rejectionReason}”
          </p>
        )}
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Fix the details in Company profile and save to resubmit it for review.
        </p>
      </div>
    );
  }

  // Pending: one simple reminder line.
  return (
    <p
      role="status"
      className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      {/* A dot rather than an emoji: ⏳ falls back to an empty box on a
          machine with no emoji font, and a status line rendering as a
          tofu box looks like a fault in the page. */}
      <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
      Pending approval — you can post jobs once the admin approves your company.
    </p>
  );
}
