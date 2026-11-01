import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `window.matchMedia`, which the theme provider and
 * the template showcase both use to read the user's system preferences.
 *
 * It is stubbed here rather than guarded in the components, because a
 * component should not carry defensive code for a gap in the test
 * environment. The stub reports "no preference", which is the neutral
 * default: light theme, motion allowed.
 */
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {}, // deprecated, kept for older libraries
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

/**
 * jsdom does not implement IntersectionObserver either, and three things
 * now depend on it: `Reveal`, `useCountUp`, and framer-motion's
 * `whileInView`.
 *
 * The stub reports every observed element as **already on screen**, which
 * is the right default for a test: a test asserting that a card is in the
 * document should not have to simulate a scroll first, and content that
 * only appears once it is scrolled to would otherwise be untestable.
 *
 * It is a stub rather than a guard inside each component for the same
 * reason as `matchMedia` above — a component should not carry defensive
 * code for a gap in the test environment.
 */
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe(element) {
      // Called synchronously: the real observer fires on the next frame,
      // but waiting here would only make every test `await` a tick.
      this.callback([{ isIntersecting: true, intersectionRatio: 1, target: element }], this);
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

  window.IntersectionObserverEntry = class {};
}
