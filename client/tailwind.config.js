/**
 * A colour read from a CSS variable, so the same class can take a different
 * value in each theme. The variables hold space-separated RGB channels and
 * live in `src/index.css` (`:root` for light, `html.dark` for dark);
 * `<alpha-value>` keeps opacity modifiers such as `bg-navy-800/60` working.
 * @param {string} name - The variable, without the `--c-` prefix.
 * @returns {string}
 */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  // The second theme. Tailwind calls its variant `dark:`, and the name is
  // kept so the existing classes keep working, but the theme it switches
  // on is now **Orange** — light grey, white, black and orange — set by a
  // `theme-orange` class on <html> from ThemeContext. The colour values
  // for it are in `src/index.css`.
  darkMode: ['selector', '.theme-orange'],

  theme: {
    extend: {
      fontFamily: {
        /**
         * The body face. A serif, because the palette is wine and cream
         * and a geometric sans on it reads as a technology product
         * wearing someone else's colours. Lora is the readable end of the
         * serif range — it holds up at 14px in a form, which is what the
         * working screens behind a login are made of.
         */
        sans: ['Lora', 'Georgia', 'serif'],

        /**
         * The display face: headlines, section headings and the wordmark.
         * Playfair Display has the high contrast and the sharp serifs that
         * suit a wine palette, and it is already loaded for the CV
         * templates so it costs nothing extra.
         */
        display: ['"Playfair Display"', 'Lora', 'Georgia', 'serif'],
      },

      colors: {
        /**
         * **This is the project's neutral ramp, not Tailwind's grey.**
         *
         * It is deliberately still called `slate`, so the several hundred
         * `text-slate-600` and `bg-slate-50` class names already in the
         * codebase pick up the new palette without being rewritten — and
         * so the next palette change is this block again rather than
         * another sweep of every file.
         *
         * The ramp runs warm cream at the light end to wine at the dark
         * end, which is what makes one set of class names work in both
         * themes: `bg-slate-50` is the page in light mode, `text-slate-900`
         * is the ink on it, and the dark theme reads from the other end.
         *
         * The jump between 300 and 400 is deliberate and is the one place
         * the ramp is not smooth. The two themes need different mid-tones
         * and no single value serves both — one light enough for the
         * maroon page is washed out on cream — so each takes its own step
         * and nothing uses 400 against maroon.
         */
        slate: {
          50: v('slate-50'), // the page in light mode; primary ink in dark
          // The off-white of the palette. Nudged up from #eddcbe so it
          // clears 4.5:1 as secondary ink on the maroon page, where the
          // original landed on 4.3:1 and just missed.
          100: v('slate-100'),
          200: v('slate-200'),
          300: v('slate-300'),
          400: v('slate-400'), // light-mode muted text: dark enough to clear 4.5:1 on cream
          500: v('slate-500'),
          600: v('slate-600'),
          700: v('slate-700'),
          800: v('slate-800'),
          900: v('slate-900'), // the wine of the palette
          950: v('slate-950'),
        },

        /**
         * `white` is a warm near-cream rather than #ffffff.
         *
         * Cards and the header use `bg-white`, and a pure white card on a
         * cream page reads as a hole punched in it. This keeps the whole
         * light theme in one temperature.
         *
         * The CV templates are unaffected: they set their own colours
         * through CSS variables in `templates.css` and use no Tailwind
         * neutral at all, so a CV stays white paper.
         */
        white: '#fcf8f0',

        /**
         * The dark theme's surfaces: near-black, from the page up to a
         * raised panel, with a mid-grey for borders. Still called `navy`
         * from an earlier palette; renaming it would touch every
         * `dark:bg-navy-900` for no change in behaviour.
         *
         * Every ramp below reads its values from CSS variables (see `v`
         * above and `src/index.css`). The light theme keeps the wine and
         * cream values; the dark theme swaps in black, grey and orange.
         */
        navy: {
          950: v('navy-950'), // the page
          900: v('navy-900'), // a card or the header
          800: v('navy-800'), // a raised panel
          700: v('navy-700'), // borders and dividers, lighter so they read
        },

        /**
         * The accent ramp, for the gradient on the logo and the primary
         * buttons.
         *
         * Wine through to a dusty rose. The keys are left as violet,
         * fuchsia and pink — the names the codebase already uses — while
         * the values moved with the palette.
         */
        brand: {
          violet: v('brand-violet'),
          fuchsia: v('brand-fuchsia'),
          pink: v('brand-pink'),
        },

        /**
         * Tailwind's own `violet` and `fuchsia`, redefined as wine.
         *
         * Forty-odd accent utilities across the codebase — `text-fuchsia-400`
         * on a dark surface, `bg-violet-50` behind a highlighted row,
         * `shadow-fuchsia-500/25` under a button — were written when the
         * brand was purple. Redefining the two ramps moves all of them at
         * once and keeps the next palette change in this file, which is
         * the same bargain made for `slate` above.
         *
         * The two differ only in temperature: `violet` leans towards the
         * wine, `fuchsia` towards the rose. The 300–400 steps are kept
         * light enough to read as accent text on a wine background, which
         * is nearly all of what `fuchsia` is used for.
         */
        violet: {
          50: v('violet-50'),
          100: v('violet-100'),
          200: v('violet-200'),
          300: v('violet-300'),
          400: v('violet-400'),
          500: v('violet-500'),
          600: v('violet-600'),
          700: v('violet-700'),
          800: v('violet-800'),
          900: v('violet-900'),
          950: v('violet-950'),
        },

        fuchsia: {
          50: v('fuchsia-50'),
          100: v('fuchsia-100'),
          200: v('fuchsia-200'),
          300: v('fuchsia-300'),
          // Used only as `dark:text-fuchsia-400`, never in light mode, so
          // it is tuned purely for legibility on the wine surfaces. It was
          // one step darker and landed on exactly 4.5:1 once the dark page
          // was lightened; this clears it with room to spare.
          400: v('fuchsia-400'),
          500: v('fuchsia-500'),
          600: v('fuchsia-600'),
          700: v('fuchsia-700'),
          800: v('fuchsia-800'),
          900: v('fuchsia-900'),
          950: v('fuchsia-950'),
        },
      },

      // The brand gradient is deliberately NOT here. It lives in
      // `src/index.css` as `.cvg-gradient-bg` and `.cvg-gradient-text`,
      // because a theme-generated background that fails to generate takes
      // the colour with it and leaves `text-transparent` behind — an
      // invisible logo and invisible buttons rather than ugly ones.
    },
  },
  plugins: [],
};
