/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060A',
          900: '#0B1220',
          850: '#121826',
          800: '#161E2E',
        },
        gold: {
          300: '#F2D27C',
          500: '#D4AF37',
          600: '#B8942E',
        },
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0,0,0,0.35)',
        glow: '0 0 24px rgba(212,175,55,0.22)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
