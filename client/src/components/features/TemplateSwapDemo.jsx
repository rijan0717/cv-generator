import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../ui/motionVariants.js';
import { DemoFrame, Line } from './demoKit.jsx';
import { useDemoCycle } from './demoHooks.js';

/**
 * Templates, as a picture: one set of content, several designs.
 *
 * The page beside the gallery changes layout and palette while the
 * *content blocks stay in the same order* — which is the claim the
 * feature makes, and the only part of it worth animating. A demo that
 * showed four unrelated pretty pages would say the opposite.
 */

/** How long each design is held. */
const PHASES = [2600, 2600, 2600];

/**
 * The designs cycled through, as the shapes they are.
 *
 * `accent` drives both the thumbnail and the page, so the palette
 * visibly travels with the design — the thing the customisation panel
 * does for real.
 */
const DESIGNS = [
  { name: 'Classic', accent: 'bg-slate-700', columns: 1, band: false, photo: false },
  { name: 'Modern', accent: 'bg-brand-violet', columns: 2, band: false, photo: true },
  { name: 'Creative', accent: 'bg-brand-fuchsia', columns: 1, band: true, photo: true },
];

/** One block of the page, drawn as bars. */
function Block({ lines = 3, width = '100%' }) {
  return (
    <div className="space-y-1.5" style={{ width }}>
      <Line width="45%" className="h-2 bg-slate-300 dark:bg-slate-500" />
      {Array.from({ length: lines }).map((_, index) => (
        <Line key={index} width={index === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}

export default function TemplateSwapDemo() {
  const reduced = useReducedMotion();
  const phase = useDemoCycle(PHASES);
  const design = DESIGNS[phase];

  return (
    <DemoFrame title="Templates — the same CV, four ways">
      <div className="flex gap-4">
        {/* The gallery rail, with the current design marked. */}
        <div className="hidden w-20 shrink-0 space-y-2 sm:block">
          {DESIGNS.map((option, index) => (
            <motion.div
              key={option.name}
              initial={false}
              animate={{
                borderColor: index === phase ? 'rgb(var(--c-glow))' : 'rgb(226 232 240 / 0.9)',
                scale: index === phase ? 1 : 0.96,
              }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              className="space-y-1 rounded-md border-2 bg-white p-1.5 dark:bg-navy-900"
            >
              <span className={`block h-1.5 w-full rounded-full ${option.accent}`} />
              <Line width="80%" className="h-1" />
              <Line width="60%" className="h-1" />
              <span className="block pt-0.5 text-[0.55rem] font-medium text-slate-500 dark:text-slate-300">
                {option.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* The page. Keyed on the design, so each one is a fresh mount
            that fades in rather than a crossfade of half-changed bars. */}
        <div className="min-h-[13rem] flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={design.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900"
            >
              {design.band && <span className={`block h-6 w-full ${design.accent}`} />}

              <div className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  {design.photo && (
                    <span className="h-7 w-7 shrink-0 rounded-full bg-slate-200 dark:bg-slate-600" />
                  )}
                  <div className="flex-1 space-y-1">
                    <Line width="50%" className={`h-2.5 ${design.accent}`} />
                    <Line width="35%" className="h-1.5" />
                  </div>
                </div>

                {design.columns === 2 ? (
                  <div className="flex gap-3">
                    <div className="w-1/3 space-y-2 rounded bg-slate-50 p-2 dark:bg-navy-800">
                      <Block lines={2} />
                      <Block lines={2} />
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <Block lines={3} />
                      <Block lines={2} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <Block lines={3} />
                    <Block lines={2} />
                    <Block lines={2} />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="mt-2 text-center text-[0.65rem] text-slate-500 dark:text-slate-300">
            Your content stays put — only the design changes.
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
