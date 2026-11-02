import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer } from './motionVariants.js';

/**
 * The scroll-reveal components the public pages are built from.
 *
 * The variants themselves are in `motionVariants.js`; this file is the
 * three wrappers that apply them.
 *
 * **Reduced motion is honoured everywhere.** Each component asks
 * framer-motion's `useReducedMotion`, and when it is true the element is
 * rendered as a plain tag in its final state with no transition at all —
 * not a faster animation, none. Movement here is decoration, and
 * decoration is the first thing to drop for somebody who has asked their
 * system for less of it.
 *
 * All of it is also one-shot: `viewport={{ once: true }}` throughout, so
 * scrolling back up a page does not replay it.
 */

/**
 * Fades and lifts its content the first time it scrolls into view.
 *
 * This replaced a hand-rolled `ui/Reveal.jsx` built directly on
 * IntersectionObserver. It kept that component's props exactly — `delay`
 * is still in milliseconds rather than framer-motion's seconds — so the
 * pages could be converted one import line at a time, and the old file is
 * now deleted.
 *
 * @param {{children: React.ReactNode, delay?: number, className?: string,
 *          as?: string, variants?: object}} props
 */
export function Reveal({ children, delay = 0, className = '', as = 'div', variants = fadeInUp }) {
  const reduced = useReducedMotion();
  const Tag = motion[as] ?? motion.div;

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      transition={{ delay: delay / 1000 }}
    >
      {children}
    </Tag>
  );
}

/**
 * A group whose children arrive one after another.
 *
 * Wrap the container in this and each child in `<Stagger.Item>`; the
 * container drives the lot, so the children need no viewport logic of
 * their own and no hand-counted delays.
 *
 * Why `useInView` + `animate` rather than `whileInView`: a child that
 * mounts *after* a `whileInView` container has played (cards arriving
 * from the server, or new content when the same page is reused for the
 * next `/features/:slug`) never receives the "shown" state and stays at
 * opacity 0. With `animate`, the container stays in "shown", and every
 * child that joins later animates in to match it.
 *
 * @param {{children: React.ReactNode, className?: string, as?: string}} props
 */
export function Stagger({ children, className = '', as = 'div' }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const Tag = motion[as] ?? motion.div;

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'shown' : 'hidden'}
      variants={staggerContainer}
    >
      {children}
    </Tag>
  );
}

/**
 * One item inside a `Stagger`.
 * @param {{children: React.ReactNode, className?: string, as?: string}} props
 */
function StaggerItem({ children, className = '', as = 'div' }) {
  const reduced = useReducedMotion();
  const Tag = motion[as] ?? motion.div;

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag className={className} variants={fadeInUp}>
      {children}
    </Tag>
  );
}

Stagger.Item = StaggerItem;

/**
 * A slow vertical drift, for the mockup beside the hero.
 *
 * Six seconds and eight pixels: enough to read as alive, little enough
 * that text inside it stays readable while it moves. It loops, which is
 * the one piece of motion on the site that does — so it is also the one
 * most worth dropping under a reduced-motion preference.
 *
 * @param {{children: React.ReactNode, className?: string,
 *          distance?: number, duration?: number}} props
 */
export function Floating({ children, className = '', distance = 8, duration = 6 }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
