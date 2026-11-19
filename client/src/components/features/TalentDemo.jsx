import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../ui/motionVariants.js';
import { DemoFrame, Line } from './demoKit.jsx';
import { useDemoCycle } from './demoHooks.js';

/**
 * The candidate directory, as a picture.
 *
 * A filter is switched on and the list narrows to the people who match.
 * Cards leave and arrive rather than the list being redrawn, so the
 * filtering is something the eye can follow — which is the whole claim:
 * you are searching people, not waiting for them to apply.
 *
 * The names are shortened to "First L.", exactly as the public preview
 * does. A demo that showed full names beside contact details would
 * advertise a thing the application deliberately does not do.
 */

const PHASES = [2400, 2600, 2600];

/** The filters, lit one after another. */
const FILTERS = ['All industries', 'Technology', 'Open to work'];

/**
 * The people. `from` is the first phase each appears in, so switching a
 * filter on removes the ones that no longer qualify.
 */
const PEOPLE = [
  { initials: 'AK', name: 'Anita K.', role: 'Frontend Developer', from: 0, until: 3 },
  { initials: 'BT', name: 'Bikash T.', role: 'Account Manager', from: 0, until: 1 },
  { initials: 'SG', name: 'Sunita G.', role: 'Data Analyst', from: 0, until: 3 },
  { initials: 'RM', name: 'Ram M.', role: 'Site Supervisor', from: 0, until: 1 },
  { initials: 'PD', name: 'Priya D.', role: 'QA Engineer', from: 1, until: 2 },
];

export default function TalentDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);

  const visible = PEOPLE.filter((person) => phase >= person.from && phase < person.until);

  return (
    <DemoFrame title="Candidates — 1,240 open to work">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter, index) => (
          <motion.span
            key={filter}
            initial={false}
            animate={{
              scale: index === phase ? 1.04 : 1,
            }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${
              index === phase
                ? 'cvg-gradient-bg text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-200'
            }`}
          >
            {filter}
          </motion.span>
        ))}
      </div>

      <div className="mt-3 grid min-h-[11rem] grid-cols-1 gap-2 sm:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((person) => (
            <motion.div
              key={person.initials}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-700 dark:bg-navy-900"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full cvg-gradient-bg text-[0.65rem] font-bold text-white">
                {person.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">
                  {person.name}
                </p>
                <p className="truncate text-[0.65rem] text-slate-500 dark:text-slate-300">
                  {person.role}
                </p>
                <Line width="60%" className="mt-1 h-1" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="mt-2 text-center text-[0.65rem] text-slate-500 dark:text-slate-300">
        Contact details stay hidden until your company is approved.
      </p>
    </DemoFrame>
  );
}
