/** @type {import('tailwindcss').Config} */
const primeui = require('tailwindcss-primeui');
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    primeui
  ],
}

