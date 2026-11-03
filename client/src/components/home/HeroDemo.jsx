import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../ui/motionVariants.js';

/**
 * The animated picture beside the home page hero, one per hero tab.
 *
 *   - **Create CV** — `BuilderDemo`: a small copy of the editor. The form
 *     fills itself in, letter by letter, and the A4 preview beside it
 *     updates as it goes, ending on "Saved". It shows the one thing that
 *     makes the builder worth using — you type, the CV appears.
 *   - **Get hired** — `RewriteDemo`: the progress card the real rewrite
 *     shows while it works, ticking through its six steps, then the score
 *     before and after.
 *
 * Both are drawings of the screens, not the screens themselves: nothing is
 * fetched and nothing can be typed into. They are `aria-hidden`, because a
 * screen reader gains nothing from a moving picture; the hero text beside
 * them already says the same in words.
 *
 * Each loops on a chain of timeouts held in state, so the whole animation
 * is "which step are we on" and can be read top to bottom. Under a
 * reduced-motion preference neither moves: they render their finished
 * state once.
 */

// --- Create CV --------------------------------------------------------------

/** What the demo types, field by field. Skills are split into chips. */
const FIELDS = [
  { key: 'name', label: 'Full name', value: 'Oliver Bennett' },
  { key: 'headline', label: 'Headline', value: 'Full Stack Developer' },
  { key: 'city', label: 'Address or city', value: 'Manchester, UK' },
  { key: 'skills', label: 'Skills', value: 'React, Node.js, MongoDB' },
];

/** Every character in the form, end to end: the length of one loop. */
const TOTAL_CHARS = FIELDS.reduce((sum, field) => sum + field.value.length, 0);

/** Timings, in milliseconds. */
const TYPE_MS = 55;
const SAVING_MS = 900;
const SAVED_HOLD_MS = 2600;

/**
 * Splits the running character count across the fields, so each field
 * shows the part of its value typed so far.
 * @param {number} count - Characters typed in total.
 * @returns {Record<string, string>} The visible text per field key.
 */
function typedValues(count) {
  let left = count;
  const values = {};
  for (const field of FIELDS) {
    values[field.key] = field.value.slice(0, Math.max(0, left));
    left -= field.value.length;
  }
  return values;
}

/** A blinking text cursor. */
function Caret() {
  return (
    <motion.span
      className="ml-px inline-block h-3 w-px translate-y-0.5 bg-slate-900 dark:bg-slate-50"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
    />
  );
}

/** A grey bar standing in for a line of text that is not the point. */
function Line({ width }) {
  return (
    <span className="block h-1 rounded-full bg-slate-200 dark:bg-slate-600" style={{ width }} />
  );
}

function BuilderDemo() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? TOTAL_CHARS : 0);
  const [phase, setPhase] = useState(reduced ? 'saved' : 'typing');

  // The loop: type one character at a time, then "Saving…", then "Saved",
  // hold, and start again from an empty form.
  useEffect(() => {
    if (reduced) return undefined;

    let timer;
    if (phase === 'typing') {
      timer =
        count < TOTAL_CHARS
          ? setTimeout(() => setCount((c) => c + 1), TYPE_MS)
          : setTimeout(() => setPhase('saving'), 400);
    } else if (phase === 'saving') {
      timer = setTimeout(() => setPhase('saved'), SAVING_MS);
    } else {
      timer = setTimeout(() => {
        setCount(0);
        setPhase('typing');
      }, SAVED_HOLD_MS);
    }
    return () => clearTimeout(timer);
  }, [count, phase, reduced]);

  const values = typedValues(count);

  // The field being typed into is the first one not yet complete.
  const activeKey =
    phase === 'typing'
      ? FIELDS.find((field) => values[field.key].length < field.value.length)?.key
      : null;

  const skills = values.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-violet/10 dark:border-navy-700 dark:bg-navy-800">
      {/* The editor's header: title, save status, the two tabs. */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-navy-700">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
            My resume
          </span>
          <span className="hidden gap-1 sm:flex">
            <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:border-navy-700 dark:text-slate-100">
              1. Design
            </span>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-white dark:bg-slate-50 dark:text-navy-900">
              2. Content
            </span>
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`text-xs font-semibold ${
              phase === 'saved'
                ? 'text-emerald-600 dark:text-emerald-600'
                : 'text-slate-500 dark:text-slate-100'
            }`}
          >
            {phase === 'typing' ? 'Editing' : phase === 'saving' ? 'Saving…' : 'Saved ✓'}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[1fr_1.1fr] gap-4 p-5">
        {/* The form. */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-50">Personal details</p>
          {FIELDS.map((field) => (
            <div key={field.key}>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-100">
                {field.label}
              </p>
              <div
                className={`mt-1 h-7 truncate rounded-md border px-2 text-[11px] leading-7 text-slate-900 transition-colors dark:text-slate-50 ${
                  activeKey === field.key
                    ? 'border-brand-fuchsia ring-2 ring-brand-fuchsia/20'
                    : 'border-slate-200 dark:border-navy-700'
                }`}
              >
                {values[field.key]}
                {activeKey === field.key && <Caret />}
              </div>
            </div>
          ))}
        </div>

        {/* The A4 preview, drawn from the same typed values. */}
        <div className="rounded-lg bg-slate-100 p-2 dark:bg-navy-900">
          <div className="aspect-[210/297] rounded bg-white p-3 shadow-sm">
            <p className="min-h-[1rem] text-center text-[11px] font-bold uppercase tracking-wide text-[#7b1220]">
              {values.name}
            </p>
            <p className="min-h-[0.75rem] text-center text-[8px] text-[#4b4b4b]">
              {values.headline}
            </p>
            <p className="min-h-[0.75rem] text-center text-[7px] text-[#6b6b6b]">{values.city}</p>

            <div className="mt-2 h-px bg-[#7b1220]/60" />

            <p className="mt-2 text-[7px] font-bold uppercase tracking-wider text-[#7b1220]">
              Summary
            </p>
            <div className="mt-1 space-y-1">
              <Line width="100%" />
              <Line width="92%" />
              <Line width="70%" />
            </div>

            <p className="mt-2 text-[7px] font-bold uppercase tracking-wider text-[#7b1220]">
              Experience
            </p>
            <div className="mt-1 space-y-1">
              <Line width="55%" />
              <Line width="96%" />
              <Line width="88%" />
            </div>

            <p className="mt-2 text-[7px] font-bold uppercase tracking-wider text-[#7b1220]">
              Skills
            </p>
            <div className="mt-1 flex min-h-[0.9rem] flex-wrap gap-1">
              <AnimatePresence initial={false}>
                {skills.map((skill, index) => (
                  // Keyed by position, so a skill being typed grows in place
                  // rather than popping in again with every letter.
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="rounded bg-[#7b1220]/10 px-1 py-px text-[7px] text-[#7b1220]"
                  >
                    {skill}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Get hired --------------------------------------------------------------

/** The steps the real rewrite reports while it works, in order. */
const REWRITE_STEPS = [
  'Reading the advert',
  'Weighting what it asks for',
  'Scoring your CV against it',
  'Re-ordering what matters most',
  'Rewriting in the advert’s language',
  'Checking the new match score',
];

const STEP_MS = 950;
const RESULT_HOLD_MS = 3800;

/** The match score before and after, for the result line. */
const SCORE_BEFORE = 54;
const SCORE_AFTER = 87;

/** A tick, for a finished step. */
function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-emerald-600 dark:text-emerald-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RewriteDemo() {
  const reduced = useReducedMotion();
  // 0..5 is the step in progress; REWRITE_STEPS.length means all done.
  const [step, setStep] = useState(reduced ? REWRITE_STEPS.length : 0);
  const done = step >= REWRITE_STEPS.length;

  useEffect(() => {
    if (reduced) return undefined;
    const timer = done
      ? setTimeout(() => setStep(0), RESULT_HOLD_MS)
      : setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [step, done, reduced]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-brand-violet/10 dark:border-navy-700 dark:bg-navy-800">
      {/* The progress bar along the top edge. */}
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 dark:bg-navy-900">
        <motion.div
          className="h-full rounded-r-full bg-gradient-to-r from-sky-400 via-brand-violet to-brand-pink"
          initial={false}
          animate={{ width: `${(step / REWRITE_STEPS.length) * 100}%` }}
          transition={{ duration: step === 0 ? 0 : 0.6, ease: EASE }}
        />
      </div>

      <div className="flex gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 via-brand-violet to-brand-pink">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#fff">
            <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-50">
            {done ? 'Your CV is ready for this job' : 'Rewriting your primary CV for this job'}
          </p>

          <ul className="mt-3 space-y-2">
            {REWRITE_STEPS.map((label, index) => {
              const state = index < step ? 'done' : index === step ? 'active' : 'pending';

              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className="grid h-5 w-5 place-items-center">
                    {state === 'done' && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check />
                      </motion.span>
                    )}
                    {state === 'active' && (
                      <span className="relative grid h-5 w-5 place-items-center">
                        <motion.span
                          className="absolute inset-0 rounded-full bg-brand-fuchsia/20"
                          animate={{ scale: [1, 1.35, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity }}
                        />
                        <span className="h-2 w-2 rounded-full bg-brand-fuchsia" />
                      </span>
                    )}
                    {state === 'pending' && (
                      <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />
                    )}
                  </span>
                  <span
                    className={
                      state === 'active'
                        ? 'font-medium text-slate-900 dark:text-slate-50'
                        : 'text-slate-500 dark:text-slate-100'
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* The result: the score before and after, and one changed line. */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-navy-900">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-100">
                      Match score
                    </span>
                    <span className="text-slate-500 dark:text-slate-100">
                      <span className="line-through">{SCORE_BEFORE}%</span>{' '}
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-600">
                        {SCORE_AFTER}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-700">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: `${SCORE_BEFORE}%` }}
                      animate={{ width: `${SCORE_AFTER}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: EASE }}
                    />
                  </div>
                  <p className="mt-3 text-[11px] leading-snug">
                    <span className="text-slate-500 line-through dark:text-slate-100">
                      Worked on the website
                    </span>{' '}
                    <span className="font-semibold text-brand-fuchsia dark:text-fuchsia-400">
                      Built REST APIs in Node.js serving 50,000 users
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- The switch -------------------------------------------------------------

/**
 * Shows the demo for the hero tab that is open, cross-fading between them
 * when the tab changes. A fresh mount each time, so each demo starts from
 * its first frame rather than wherever it was left.
 *
 * @param {{tab: 'create-cv'|'get-hired'}} props
 */
export default function HeroDemo({ tab }) {
  return (
    // A fixed minimum height, centred: the two cards differ in height,
    // and without it the hero text would jump on every switch.
    <div aria-hidden="true" className="flex min-h-[30rem] items-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="w-full"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {tab === 'get-hired' ? <RewriteDemo /> : <BuilderDemo />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
