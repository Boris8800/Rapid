/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#B4966B',
        'primary-dark': '#8C724D',
        'background-light': '#ffffff',
        'background-dark': '#0C0B09',
        'surface-dark': '#16161D',
        'surface-dark-lighter': '#21212B',
        'text-muted': '#4B5563',
      },
      fontFamily: {
        display: ['"Source Serif Four"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        '3xl': '0 18px 60px -18px rgba(0, 0, 0, 0.45)',
        '4xl': '0 30px 90px -30px rgba(0, 0, 0, 0.55)',
      },
    },
  },
  plugins: [],
};
