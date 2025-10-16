/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00D4AA',
        'background-dark': '#0A0F0F',
        'background-light': '#FFFFFF',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}