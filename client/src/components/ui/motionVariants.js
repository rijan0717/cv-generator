/**
 * The shared motion vocabulary for the public pages.
 *
 * Variants live here rather than beside the components in `motion.jsx` so
 * that file exports components and nothing else — which is what lets Fast
 * Refresh work on it, and is the same split the rest of the codebase uses
 * for contexts and their hooks.
 *
 * One vocabulary rather than variants written inline at each call site,
 * because a page where every section eases differently reads as a page
 * nobody designed. Everything here uses the same distance, the same curve
 * and one of two durations, so the whole site moves in one accent.
 */

/** The one curve. A gentle ease-out — fast to start, settling at the end. */
export const EASE = [0.21, 0.47, 0.32, 0.98];

/** How far anything travels. Small on purpose: a hint, not a journey. */
const DISTANCE = 16;

/**
 * A container that releases its children one after another.
 *
 * `staggerChildren` only reaches direct children that are themselves
 * motion components with matching variant names, which is why `fadeInUp`
 * declares the same `hidden` and `shown` keys.
 */
export const staggerContainer = {
  hidden: {},
  shown: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** The workhorse: up and in. */
export const fadeInUp = {
  hidden: { opacity: 0, y: DISTANCE },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** For something that should arrive with a little more presence. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  shown: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

/**
 * The hover treatment shared by every card: a small lift, carried by
 * framer-motion rather than a CSS transition so it composes with the
 * entrance animation instead of fighting it.
 *
 * Spread onto a `motion` element. The glow and the shadow stay in
 * Tailwind, where they can respond to the theme.
 */
export const hoverLift = {
  whileHover: { y: -6, transition: { duration: 0.2, ease: EASE } },
  whileTap: { y: -2 },
};
