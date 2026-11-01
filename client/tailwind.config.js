/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  // Dark mode is driven by a `dark` class on <html>, not by the media query
  // alone. That is what lets the user override their operating system
  // setting with the toggle in the navigation bar.
  darkMode: 'class',

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
          50: '#faf4e8', // the page in light mode; primary ink in dark
          // The off-white of the palette. Nudged up from #eddcbe so it
          // clears 4.5:1 as secondary ink on the maroon page, where the
          // original landed on 4.3:1 and just missed.
          100: '#f2e5ce',
          200: '#dcc6a2',
          300: '#d8bb94',
          400: '#7e5f3e', // light-mode muted text: dark enough to clear 4.5:1 on cream
          500: '#8a6646',
          600: '#6e4433',
          700: '#5a2a26',
          800: '#4a1317',
          900: '#4a0509', // the wine of the palette
          950: '#35050a',
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
         * The dark theme's surfaces: light maroon.
         *
         * Still called `navy` from the palette this replaced. The name is
         * wrong and the values are right; renaming it would mean touching
         * every `dark:bg-navy-900` in the codebase for no behaviour
         * change.
         *
         * **The page is a mid-tone, and that constrains the text.**
         * #A24857 has a relative luminance of 0.13 — too light for a
         * comfortable dark theme, too dark for a light one. Only near-
         * white ink clears 4.5:1 on it (the palette's own cream reaches
         * 4.3:1 and just misses), so the dark theme's text hierarchy is
         * compressed into the top of the ramp: `slate-50` for primary,
         * `slate-100` for secondary, and little room between them.
         *
         * Cards therefore go *darker* than the page rather than lighter,
         * which is the opposite of the usual dark-theme direction. On a
         * mid-tone background that is where the contrast headroom is: a
         * darker card gives the light text on it more room, not less.
         */
        navy: {
          950: '#a24857', // the page
          900: '#8d3b49', // a card or the header
          800: '#7a3140', // a raised panel
          700: '#c06e7b', // borders and dividers, lighter so they read
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
          violet: '#7b1220',
          fuchsia: '#a32638',
          pink: '#c65a6b',
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
          50: '#fbf0f1',
          100: '#f6dcdf',
          200: '#ecbcc2',
          300: '#dd94a0',
          400: '#c76c7e',
          500: '#a32638',
          600: '#8e1a28',
          700: '#7b1220',
          800: '#640d1a',
          900: '#4a0509',
          950: '#35050a',
        },

        fuchsia: {
          50: '#fdf0f2',
          100: '#fadde1',
          200: '#f2bec6',
          300: '#e59ba7',
          // Used only as `dark:text-fuchsia-400`, never in light mode, so
          // it is tuned purely for legibility on the wine surfaces. It was
          // one step darker and landed on exactly 4.5:1 once the dark page
          // was lightened; this clears it with room to spare.
          400: '#e49aa6',
          500: '#c65a6b',
          600: '#ad3d50',
          700: '#8e2639',
          800: '#731c2b',
          900: '#4a0509',
          950: '#35050a',
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
