/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          975: '#030405',
          950: '#06080B',
          900: '#0A0E12',
          850: '#111821',
          800: '#192330',
          750: '#202F41',
        },
        gold: {
          100: '#FFF4D8',
          200: '#FFE7B0',
          300: '#FFD680',
          400: '#FFBE3D',
          500: '#F3A712',
          600: '#D68E0D',
          700: '#A86E0A',
          800: '#6F4A0A',
          900: '#3B280A',
        },
        terminal: {
          cyan: '#2FD1FF',
          green: '#40E788',
          red: '#FF6A5C',
          blue: '#4EA9FF',
        },
      },
      boxShadow: {
        panel: '0 14px 32px rgba(0,0,0,0.55)',
        glow: '0 0 24px rgba(243,167,18,0.28)',
        terminal: '0 0 0 1px rgba(243,167,18,0.2), 0 18px 36px rgba(0,0,0,0.45)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Rajdhani"', '"IBM Plex Sans Condensed"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'translateX(-110%)' },
          '100%': { transform: 'translateX(110%)' },
        },
        pulseBar: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        sweep: 'sweep 5s linear infinite',
        pulseBar: 'pulseBar 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
