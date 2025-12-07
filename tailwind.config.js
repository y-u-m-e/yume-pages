/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OSRS-inspired color palette
        'yume': {
          'teal': '#5eead4',
          'teal-dark': '#2dd4bf',
          'cyan': '#00ffff',
          'orange': '#ff981f',
          'pink': '#ff00ff',
          'panel': 'rgba(15, 40, 50, 0.6)',
          'panel-dark': 'rgba(20, 60, 60, 0.7)',
          'border': 'rgba(94, 234, 212, 0.2)',
        },
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'runescape': ['RuneScape UF', 'Trebuchet MS', 'Arial Black', 'sans-serif'],
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

