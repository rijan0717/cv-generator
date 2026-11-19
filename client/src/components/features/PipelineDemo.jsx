import { motion, useReducedMotion } from 'framer-motion';
import { DemoFrame, Line } from './demoKit.jsx';
import { useDemoCycle } from './demoHooks.js';

/**
 * Applicant tracking, as a picture: one candidate moving along.
 *
 * The card travels between the columns rather than each column filling
 * independently, because the thing being explained is that an
 * application has one state and somebody moves it — not that there are
 * three lists.
 *
 * Framer Motion's shared `layoutId` does the movement: the card is
 * rendered inside whichever column it belongs to, and the library
 * animates the gap between its old and new position. Nothing computes
 * coordinates, so it stays right at any width.
 */

const PHASES = [2000, 2000, 2000, 2600];

/** The columns, and the status each stands for. */
const COLUMNS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
];

/** The other applications, which stay where they are. */
const EXTRAS = {
  submitted: 2,
  reviewed: 1,
  shortlisted: 1,
  interview: 0,
};

/** A card for one of the applications that is not the point. */
function GhostCard() {
  return (
    <div className="space-y-1.5 rounded-md border border-slate-200 bg-white p-2 dark:border-navy-700 dark:bg-navy-900">
      <Line width="70%" className="h-1.5" />
      <Line width="45%" className="h-1" />
    </div>
  );
}

export default function PipelineDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);

  // The last phase holds on Interview rather than adding a fifth column.
  const activeColumn = Math.min(phase, COLUMNS.length - 1);

  return (
    <DemoFrame title="Applications — Operations Manager">
      <div className="grid grid-cols-4 gap-2">
        {COLUMNS.map((column, index) => (
          <div key={column.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <p className="truncate text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {column.label}
              </p>
              <span className="text-[0.6rem] text-slate-400">
                {EXTRAS[column.key] + (index === activeColumn ? 1 : 0)}
              </span>
            </div>

            <div className="mt-1.5 min-h-[7rem] space-y-1.5 rounded-lg bg-slate-50 p-1.5 dark:bg-navy-900/60">
              {index === activeColumn && (
                <motion.div
                  layoutId="tracked-application"
                  transition={{
                    duration: reduced ? 0 : 0.5,
                    type: reduced ? 'tween' : 'spring',
                    bounce: 0.2,
                  }}
                  className="space-y-1.5 rounded-md border border-brand-violet bg-white p-2 shadow-sm dark:bg-navy-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 shrink-0 rounded-full cvg-gradient-bg" />
                    <Line width="60%" className="h-1.5 bg-slate-400 dark:bg-slate-400" />
                  </div>
                  <Line width="80%" className="h-1" />
                  <span className="block text-[0.55rem] font-medium text-brand-violet">
                    CV as submitted
                  </span>
                </motion.div>
              )}

              {Array.from({ length: EXTRAS[column.key] }).map((_, ghost) => (
                <GhostCard key={ghost} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[0.65rem] text-slate-500 dark:text-slate-300">
        The employer moves it. The applicant sees the same status, never the private note.
      </p>
    </DemoFrame>
  );
}
