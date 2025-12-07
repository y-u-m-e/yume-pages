/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern dark theme with soft mint accent
        'yume': {
          'accent': '#a8e6cf',        // Soft pastel mint
          'accent-dim': '#88d4ab',    // Slightly dimmer accent
          'bg': '#141414',            // Main background
          'bg-light': '#1a1a1a',      // Lighter background
          'card': '#1e1e1e',          // Card background
          'card-hover': '#252525',    // Card hover state
          'border': 'rgba(255, 255, 255, 0.08)',
          'border-accent': 'rgba(212, 255, 0, 0.3)',
        },
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'outfit': ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
