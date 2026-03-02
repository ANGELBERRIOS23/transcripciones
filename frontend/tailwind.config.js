/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#135bec',
        'primary-light': '#eef4ff',
        'background-light': '#f6f8fa',
        'background-dark': '#0d1117',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        card: '0 10px 30px -10px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
