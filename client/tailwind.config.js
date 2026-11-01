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

        // The headlines on the public pages and the section headings.
        // Kept separate from `sans` so the working screens behind a login
        // stay in Inter, which is the better face for dense forms.
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],

        // The wordmark alone, and nothing else. A brush script is a
        // signature, not a typeface to set text in: it is unreadable at
        // small sizes and in long runs, so it is confined to the five
        // letters of the logo.
        brand: ['"Kaushan Script"', 'cursive'],
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

      backgroundImage: {
        // One definition of the brand gradient, used by the wordmark, the
        // primary buttons and the search control.
        'brand-gradient': 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
      },
    },
  },
  plugins: [],
};
