/**
 * The letter as it will arrive, shown beside the form that writes it.
 *
 * Deliberately styled like a mail client rather than like the rest of the
 * application: the point of the panel is to answer "what will the
 * employer actually see?", and a preview that looks like our own form
 * does not answer it.
 *
 * @param {{from: string, to: string, subject: string, body: string,
 *          attachmentName?: string, isBusy?: boolean}} props -
 *   `attachmentName` is omitted when the CV is not being attached.
 */
export default function EmailPreview({
  from,
  to,
  subject,
  body,
  attachmentName = '',
  isBusy = false,
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900">
      <dl className="space-y-1 border-b border-slate-200 p-4 text-sm dark:border-navy-700">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500 dark:text-slate-400">From</dt>
          <dd className="truncate text-slate-700 dark:text-slate-200">{from || '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500 dark:text-slate-400">To</dt>
          <dd className="truncate text-slate-700 dark:text-slate-200">
            {to || <span className="text-slate-400">No recipient yet</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500 dark:text-slate-400">Subject</dt>
          <dd className="truncate font-medium text-slate-900 dark:text-slate-50">
            {subject || <span className="font-normal text-slate-400">No subject yet</span>}
          </dd>
        </div>
      </dl>

      {/* `whitespace-pre-wrap`, because the letter is plain text and its
          blank lines between paragraphs are the only formatting it has. */}
      <div className="flex-1 overflow-y-auto p-4">
        {isBusy && !body ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Composing…</p>
        ) : body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {body}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose a CV and enter a company name, and the letter will be written here.
          </p>
        )}
      </div>

      {attachmentName && (
        <div className="flex items-center gap-2 border-t border-slate-200 p-4 dark:border-navy-700">
          <svg
            className="h-4 w-4 shrink-0 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.8V7a5 5 0 0 0-10 0v10a3 3 0 0 0 6 0V8" />
          </svg>
          <span className="truncate text-sm text-slate-600 dark:text-slate-300">
            {attachmentName}
          </span>
        </div>
      )}
    </div>
  );
}
