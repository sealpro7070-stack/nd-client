/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0eeff',
          100: '#e4e0ff',
          200: '#ccc5ff',
          300: '#a89bff',
          400: '#8b77ff',
          500: '#6C5CE7',
          600: '#5a47d4',
          700: '#4a38bb',
          800: '#3d2e98',
          900: '#33277a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
