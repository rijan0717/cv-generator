import { motion, useReducedMotion } from 'framer-motion';
import { DemoFrame, Tick } from './demoKit.jsx';
import { useDemoCycle } from './demoHooks.js';

/**
 * Interview practice, as a picture.
 *
 * A question, four options, a choice, the mark, and — the part that
 * matters — the explanation. The demo deliberately picks the *wrong*
 * answer first: a practice tool that only ever shows a correct answer
 * teaches nothing, and the reason beneath is the whole point of it.
 */

/** Read the question, choose, be marked, read why. */
const PHASES = [2200, 1200, 1600, 3400];

const QUESTION = {
  text: 'Which HTTP status code should an API return when a request is well formed but the user is not allowed to see the resource?',
  options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '400 Bad Request'],
  chosen: 0,
  correct: 1,
  explanation:
    '401 means “we do not know who you are”. 403 means “we know, and you still may not”. The request itself was fine, so it is not 400.',
};

export default function QuizDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);

  const hasChosen = phase >= 1;
  const isMarked = phase >= 2;
  const showsWhy = phase >= 3;

  return (
    <DemoFrame title="Interview practice — Backend Developer, mid">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[0.65rem] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
          Question 4 of 10
        </span>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-700">
          <motion.span
            className="block h-full rounded-full cvg-gradient-bg"
            initial={false}
            animate={{ width: isMarked ? '40%' : '30%' }}
            transition={{ duration: reduced ? 0 : 0.4 }}
          />
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-snug text-slate-900 dark:text-slate-50">
        {QUESTION.text}
      </p>

      <div className="mt-3 space-y-2">
        {QUESTION.options.map((option, index) => {
          const isChosen = hasChosen && index === QUESTION.chosen;
          const isCorrect = index === QUESTION.correct;

          // Before marking, the chosen answer is simply selected. After,
          // the right one is always shown green even though it was not
          // the one picked — which is how the real review screen reads.
          const state = !isMarked
            ? isChosen
              ? 'chosen'
              : 'idle'
            : isCorrect
              ? 'correct'
              : isChosen
                ? 'wrong'
                : 'idle';

          const styles = {
            idle: 'border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900',
            chosen: 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/50',
            correct:
              'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/50',
            wrong: 'border-red-300 bg-red-50 dark:border-red-500/60 dark:bg-red-950/40',
          };

          return (
            <motion.div
              key={option}
              initial={false}
              animate={{ scale: state === 'chosen' ? 1.01 : 1 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${styles[state]}`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-white ${
                  state === 'correct'
                    ? 'border-emerald-500 bg-emerald-500'
                    : state === 'wrong'
                      ? 'border-red-400 bg-red-400'
                      : state === 'chosen'
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-slate-300 dark:border-slate-500'
                }`}
              >
                {state === 'correct' && <Tick className="h-2.5 w-2.5" />}
                {state === 'wrong' && <span className="text-[0.6rem] leading-none">×</span>}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-100">{option}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: showsWhy ? 1 : 0, y: showsWhy ? 0 : 8 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
        className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-navy-900"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Why
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-100">
          {QUESTION.explanation}
        </p>
      </motion.div>
    </DemoFrame>
  );
}
