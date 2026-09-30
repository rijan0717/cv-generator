import TemplatePreview from './TemplatePreview.jsx';

/**
 * Illustrations for the home page feature rows.
 *
 * These are stylised depictions built from real markup, not screenshots
 * and not stock imagery. Where a CV appears it is the genuine template
 * component, so it cannot drift out of date. Where an interface appears
 * it is an obvious simplification rather than a pretend screenshot,
 * because a fake screenshot of a real product is a promise you may not
 * keep.
 *
 * All of it is decorative, so each panel is hidden from assistive
 * technology; the surrounding copy carries the meaning.
 */

/** A soft panel the illustrations sit on. */
function Panel({ children, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 p-4 sm:p-6 ring-1 ring-slate-200 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-700 ${className}`}
    >
      {children}
    </div>
  );
}

/** A grey bar standing in for a line of text. */
function Bar({ width = '100%', tone = 'bg-slate-300 dark:bg-slate-600' }) {
  return <span className={`block h-2 rounded ${tone}`} style={{ width }} />;
}

/**
 * The editor: a form on the left, a live page on the right.
 */
export function EditorIllustration() {
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <Bar width="45%" tone="bg-indigo-500" />
          <div className="space-y-2">
            <div className="h-7 rounded border border-slate-200 dark:border-slate-700" />
            <div className="h-7 rounded border border-slate-200 dark:border-slate-700" />
            <div className="h-16 rounded border border-slate-200 dark:border-slate-700" />
          </div>
          <Bar width="60%" />
          <div className="h-7 w-24 rounded bg-slate-900 dark:bg-slate-100" />
        </div>

        <div className="flex items-start justify-center">
          <TemplatePreview templateKey="classic" width={150} />
        </div>
      </div>
    </Panel>
  );
}

/**
 * Customisation: a colour row, a font row, and the page reacting.
 */
export function CustomiseIllustration() {
  const swatches = ['#4f46e5', '#0f766e', '#be123c', '#166534', '#0f172a'];

  return (
    <Panel>
      <div className="flex items-start gap-4">
        <div className="w-40 space-y-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div>
            <Bar width="50%" tone="bg-slate-400 dark:bg-slate-500" />
            <div className="mt-2 flex gap-1.5">
              {swatches.map((colour, index) => (
                <span
                  key={colour}
                  className={`h-5 w-5 rounded-full ${index === 0 ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900' : ''}`}
                  style={{ background: colour }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Bar width="40%" tone="bg-slate-400 dark:bg-slate-500" />
            <div className="h-6 rounded border border-slate-200 dark:border-slate-700" />
          </div>

          <div className="flex gap-1.5">
            <span className="h-6 flex-1 rounded bg-slate-900 dark:bg-slate-100" />
            <span className="h-6 flex-1 rounded border border-slate-300 dark:border-slate-600" />
            <span className="h-6 flex-1 rounded border border-slate-300 dark:border-slate-600" />
          </div>
        </div>

        <TemplatePreview templateKey="modern" width={160} />
      </div>
    </Panel>
  );
}

/**
 * Import: a file turning into filled-in sections.
 */
export function ImportIllustration() {
  const sections = ['Personal details', 'Experience', 'Education', 'Skills'];

  return (
    <Panel>
      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-indigo-300 p-4 dark:border-indigo-700">
          <svg
            className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path
              strokeLinejoin="round"
              d="M13 3H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1V8z"
            />
            <path strokeLinejoin="round" d="M13 3v5h5" />
          </svg>
          <div className="flex-1 space-y-1.5">
            <Bar width="55%" />
            <Bar width="30%" tone="bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {sections.map((section) => (
            <li key={section} className="flex items-center gap-2 text-xs">
              <svg
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-slate-600 dark:text-slate-400">{section}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/**
 * Export: the three formats the application produces.
 */
export function ExportIllustration() {
  const formats = [
    { label: 'PDF', tone: 'bg-red-500' },
    { label: 'Word', tone: 'bg-sky-600' },
    { label: 'Excel', tone: 'bg-emerald-600' },
  ];

  return (
    <Panel>
      <div className="flex items-center justify-center gap-4">
        <TemplatePreview templateKey="minimal" width={130} />

        <div className="space-y-2">
          {formats.map((format) => (
            <div
              key={format.label}
              className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 shadow-sm dark:bg-slate-900"
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded text-[10px] font-bold text-white ${format.tone}`}
              >
                {format.label.slice(0, 3).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {format.label}
              </span>
              <svg
                className="ml-2 h-4 w-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/**
 * The two scores: the CV's own score, the match against a job, and the
 * criteria the first of them is built from.
 */
export function ScoreIllustration() {
  const criteria = [
    { label: 'Complete sections', width: '86%', tone: 'bg-emerald-500' },
    { label: 'Action verbs used', width: '64%', tone: 'bg-indigo-500' },
    { label: 'Quantified results', width: '38%', tone: 'bg-amber-500' },
  ];

  return (
    <Panel>
      <div className="space-y-3">
        <div className="flex gap-3">
          {/* The two numbers, side by side, as they appear in the product. */}
          <div className="flex-1 rounded-xl bg-white p-4 text-center shadow-sm dark:bg-slate-900">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              AI score
            </span>
            <span className="mt-1 block text-2xl font-bold text-slate-900 dark:text-slate-100">
              (72)
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-white p-4 text-center shadow-sm dark:bg-slate-900">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              AI match
            </span>
            <span className="mt-1 block text-2xl font-bold text-slate-900 dark:text-slate-100">
              (64%)
            </span>
          </div>
        </div>

        {/* What the score is made of, so the number does not look arbitrary. */}
        <div className="space-y-2.5 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          {criteria.map((criterion) => (
            <div key={criterion.label} className="space-y-1">
              <span className="block text-[10px] text-slate-600 dark:text-slate-400">
                {criterion.label}
              </span>
              <span className="block h-1.5 rounded bg-slate-200 dark:bg-slate-700">
                <span
                  className={`block h-1.5 rounded ${criterion.tone}`}
                  style={{ width: criterion.width }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/**
 * The job board: a few postings and an application moving along.
 */
export function JobsIllustration() {
  const jobs = [
    { title: 'Software Developer', tone: 'bg-indigo-500' },
    { title: 'QA Engineer', tone: 'bg-teal-500' },
    { title: 'Data Analyst', tone: 'bg-amber-500' },
  ];

  return (
    <Panel>
      <div className="space-y-2.5">
        {jobs.map((job, index) => (
          <div
            key={job.title}
            className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900"
          >
            <span className={`h-8 w-8 shrink-0 rounded ${job.tone}`} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                {job.title}
              </span>
              <Bar width="45%" tone="bg-slate-200 dark:bg-slate-700" />
            </div>
            {index === 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Applied
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
