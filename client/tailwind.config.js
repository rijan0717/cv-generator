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
        sans: ['Inter', 'system-ui', 'sans-serif'],

        // The headlines on the public pages and the section headings, and
        // the wordmark, which is the same geometric sans set heavy and
        // tight. Kept separate from `sans` so the working screens behind a
        // login stay in Inter, which is the better face for dense forms.
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },

      colors: {
        /**
         * The brand ramp: violet through to pink.
         *
         * Two anchors rather than a full scale, because that is all the
         * mark and the accents need — `violet` for the start of every
         * gradient, `pink` for its end. Anything else uses Tailwind's own
         * slate, so the interface stays neutral and the brand colour means
         * something when it does appear.
         */
        brand: {
          violet: '#7c3aed',
          fuchsia: '#a855f7',
          pink: '#ec4899',
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
