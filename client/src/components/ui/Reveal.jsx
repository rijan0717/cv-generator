import { useEffect, useRef, useState } from 'react';

/**
 * Fades its content in and up slightly the first time it scrolls into view.
 *
 * Uses the browser's IntersectionObserver, so there is no animation
 * library and no work done on every scroll event. It runs once per element
 * and then stops watching. Anyone whose system asks for reduced motion
 * sees the content straight away, with no movement at all.
 *
 * @param {{children: React.ReactNode, delay?: number, className?: string,
 *          as?: string}} props - `delay` in milliseconds, for staggering a
 *   row of cards; `as` is the element to render (default "div").
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
      className={[
        'transition duration-700 ease-out motion-reduce:transition-none',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}
