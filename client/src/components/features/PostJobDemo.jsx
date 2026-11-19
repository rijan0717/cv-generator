import { motion, useReducedMotion } from 'framer-motion';
import { DemoFrame, Line, Tick } from './demoKit.jsx';
import { useDemoCycle, useTypewriter } from './demoHooks.js';

/**
 * Posting a role, as a picture.
 *
 * The advert types itself, goes live, and then applications arrive with
 * a match score already on each one — which is the difference worth
 * showing. Anyone can host a form; the board answers "who actually
 * fits?" before the employer has opened a single CV.
 *
 * The scores are the demo's own numbers, not a live calculation: this
 * runs on a public page with no session and nothing to score.
 */

const PHASES = [3200, 1200, 2600];

/** The title typed into the advert. */
const TITLE = 'Operations Manager';

/** The applicants that arrive, highest match first, as the board sorts. */
const APPLICANTS = [
  { initials: 'AK', match: 91 },
  { initials: 'RP', match: 84 },
  { initials: 'SG', match: 72 },
];

export default function PostJobDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);
  const { shown } = useTypewriter(TITLE, { speed: 70, hold: 1200 });

  const isLive = phase >= 1;
  const hasApplicants = phase >= 2;

  return (
    <DemoFrame title="New job post — Sagarmatha Supply">
      <div className="space-y-3">
        <div>
          <p className="text-[0.65rem] font-medium text-slate-500 dark:text-slate-300">Job title</p>
          <div className="mt-1 rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-navy-600">
            <span className="text-sm text-slate-900 dark:text-slate-50">
              {phase === 0 ? shown : TITLE}
              {phase === 0 && !reduced && (
                <motion.span
                  className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-slate-900 dark:bg-slate-50"
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                />
              )}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-medium text-slate-600 dark:bg-navy-700 dark:text-slate-200">
            Full time
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-medium text-slate-600 dark:bg-navy-700 dark:text-slate-200">
            Kathmandu
          </span>
          <motion.span
            initial={false}
            animate={{ opacity: isLive ? 1 : 0.35 }}
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {isLive && <Tick className="h-2.5 w-2.5" />}
            {isLive ? 'Live on the board' : 'Draft'}
          </motion.span>
        </div>

        <div className="space-y-1.5">
          <Line width="100%" />
          <Line width="92%" />
          <Line width="60%" />
        </div>

        {/* The applications, with the match each CV scores against this
            advert — the board's own figure, not the employer's guess. */}
        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-navy-900/60">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            Applications
          </p>

          <div className="mt-2 space-y-1.5">
            {APPLICANTS.map((applicant, index) => (
              <motion.div
                key={applicant.initials}
                initial={false}
                animate={{
                  opacity: hasApplicants ? 1 : 0,
                  x: hasApplicants ? 0 : -12,
                }}
                transition={{
                  duration: reduced ? 0 : 0.35,
                  delay: reduced || !hasApplicants ? 0 : index * 0.18,
                }}
                className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 dark:bg-navy-800"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full cvg-gradient-bg text-[0.6rem] font-bold text-white">
                  {applicant.initials}
                </span>
                <div className="flex-1 space-y-1">
                  <Line width="55%" className="h-1.5" />
                  <Line width="35%" className="h-1" />
                </div>
                <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[0.6rem] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                  {applicant.match}% match
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
