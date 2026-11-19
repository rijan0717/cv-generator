import { motion, useReducedMotion } from 'framer-motion';
import { DemoFrame, Line, Tick } from './demoKit.jsx';
import { useDemoCycle } from './demoHooks.js';

/**
 * CV strength scoring, as a picture.
 *
 * The ring fills to the mark and the criteria tick off one by one, then
 * the suggestion appears — which is the order the real scorer reports
 * in, and the point worth making: the number is not a verdict on its
 * own, it comes with the list of what earned it.
 */

/** The phases: an empty ring, filling, the criteria, then the advice. */
const PHASES = [700, 1400, 2200, 3200];

/** What the demo marks off, with the weights the real scorer uses. */
const CRITERIA = [
  { label: 'Contact details', points: 10 },
  { label: 'Summary length', points: 10 },
  { label: 'Action verbs used', points: 15 },
  { label: 'Quantified achievements', points: 15 },
];

/** The mark the ring settles on. */
const SCORE = 86;

export default function ScoreDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);

  // The ring is a stroked circle with its dash offset driven by the
  // score, which is the one way to draw an arc that animates cleanly at
  // any size.
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const shownScore = phase === 0 ? 0 : SCORE;

  return (
    <DemoFrame title="CV strength — Marketing Intern">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-slate-200 dark:stroke-navy-700"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-brand-violet"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: circumference * (1 - shownScore / 100) }}
              transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
            />
          </svg>

          <div className="absolute inset-0 grid place-content-center text-center">
            <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-50">
              {shownScore}
            </p>
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
              out of 100
            </p>
          </div>
        </div>

        <div className="w-full space-y-2.5">
          {CRITERIA.map((criterion, index) => {
            // One criterion per phase after the ring has filled, so the
            // list reads as the score being worked out rather than
            // appearing all at once.
            const isTicked = phase >= 2 && index <= (phase - 2) * 2 + 1;

            return (
              <div key={criterion.label} className="flex items-center gap-2.5">
                <motion.span
                  initial={false}
                  animate={{
                    backgroundColor: isTicked ? 'rgb(16 185 129)' : 'rgb(226 232 240)',
                    scale: isTicked ? 1 : 0.9,
                  }}
                  transition={{ duration: reduced ? 0 : 0.25 }}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                >
                  {isTicked && <Tick />}
                </motion.span>

                <span className="flex-1 text-xs text-slate-700 dark:text-slate-100">
                  {criterion.label}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                  {isTicked ? `+${criterion.points}` : '—'}
                </span>
              </div>
            );
          })}

          {/* The part people act on. Held back to last, because a
              suggestion means nothing until the mark it would raise is
              on screen. */}
          <motion.div
            initial={false}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 6 }}
            transition={{ duration: reduced ? 0 : 0.3 }}
            className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/40"
          >
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Add a figure to your second role to gain 6 more.
            </p>
            <Line width="70%" className="mt-2 bg-amber-200/70 dark:bg-amber-900" />
          </motion.div>
        </div>
      </div>
    </DemoFrame>
  );
}
