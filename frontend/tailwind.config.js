/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page:    '#F9F7F3',
        heading: '#1A1A2E',
        body:    '#374151',
        muted:   '#6B7280',
        subtle:  '#9CA3AF',
        line:    '#E5E7EB',
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
        },
        ok: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warn: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          50:  '#FFF5F5',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
        },
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      boxShadow: {
        card:    '0 2px 12px rgba(0,0,0,0.06)',
        'card-md': '0 4px 20px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 30px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}
