/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./entrypoints/**/*.{html,ts,tsx}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['forest'],
  },
};
