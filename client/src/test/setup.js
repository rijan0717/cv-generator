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
