/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#e11d48',
          gold: '#eab308'
        }
      }
    },
  },
  plugins: [],
}
