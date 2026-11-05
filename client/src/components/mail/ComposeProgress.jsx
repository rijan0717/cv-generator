import { useState, useEffect } from 'react';

/**
 * The "working on it" panel shown while a letter is being composed.
 *
 * The same shape as `RewriteProgress`, deliberately: both are the
 * generative action of the application, and a user who has seen one
 * should recognise the other immediately. The steps differ because the
 * work differs — this one reads a CV and writes a letter rather than
 * rewriting the CV itself.
 *
 * The steps are driven by a timer rather than by real progress, because
 * the server answers in one response and there is nothing to stream.
 * They are paced to run slightly slower than a typical request, so the
 * panel usually disappears part-way through — which reads as "it
 * finished early" rather than as a progress bar that lied. The last step
 * has no timer and stays until the response lands.
 *
 * `prefers-reduced-motion` turns off the sweep and the pulse. The list
 * still advances, so nothing is lost.
 */
const STEPS = [
  'Reading your CV',
  'Finding your strongest evidence',
  'Weighting what the advert asks for',
  'Matching your skills to it',
  'Writing the letter',
  'Checking nothing was invented',
];

/** How long each step is shown, in milliseconds. */
const STEP_MS = 420;

/**
 * @param {{cvTitle?: string}} props - The CV being read, if known.
 */
export default function ComposeProgress({ cvTitle }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Stops on the last step rather than looping: a list that started
    // again from the top would say the work had restarted.
    if (step >= STEPS.length - 1) return undefined;

    const timer = setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-navy-700"
    >
      <div className="h-1 w-full overflow-hidden bg-slate-100 dark:bg-navy-800">
        <div className="h-full w-1/3 animate-[compose-sweep_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 motion-reduce:w-full motion-reduce:animate-none" />
      </div>

      <div className="flex gap-4 p-6">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 via-violet-500 to-fuchsia-500 text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1ZM5.5 15l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6L3.2 17.3l1.6-.7.7-1.6Z" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">
            Writing your letter from {cvTitle ? `“${cvTitle}”` : 'your CV'}
          </h2>

          <ol className="mt-3 space-y-1.5">
            {STEPS.map((label, index) => {
              const state = index < step ? 'done' : index === step ? 'active' : 'waiting';

              return (
                <li
                  key={label}
                  className={[
                    'flex items-center gap-2 text-sm transition-colors',
                    state === 'done'
                      ? 'text-slate-500 dark:text-slate-100'
                      : state === 'active'
                        ? 'font-medium text-slate-900 dark:text-slate-50'
                        : 'text-slate-400 dark:text-slate-600',
                  ].join(' ')}
                >
                  <StepMark state={state} />
                  {label}
                  {state === 'active' && <span className="sr-only"> — in progress</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <style>{`
        @keyframes compose-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </section>
  );
}

/**
 * The tick, dot or ring beside one step.
 * @param {{state: 'done'|'active'|'waiting'}} props
 */
function StepMark({ state }) {
  if (state === 'done') {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-emerald-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (state === 'active') {
    return (
      <span
        className="relative flex h-4 w-4 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-violet-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative h-2 w-2 rounded-full bg-violet-500" />
      </span>
    );
  }

  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-navy-700"
      aria-hidden="true"
    />
  );
}
