/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface hierarchy (deep navy, darkest to lightest)
        ink: {
          950: '#04070d',
          900: '#070b14',
          850: '#0a1020',
          800: '#0d1526',
          700: '#131e35',
          600: '#1a2a47',
          500: '#243759',
        },
        // Hairline borders
        line: {
          DEFAULT: '#1a2842',
          strong: '#2a3d60',
        },
        // Semantic data colours. Used identically in the map, charts and legends.
        sensor: {
          modis: '#fb7185',
          viirs: '#fbbf24',
          fused: '#22d3ee',
        },
        signal: {
          DEFAULT: '#38bdf8',
          strong: '#0ea5e9',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(148,163,184,0.05) inset, 0 10px 28px -14px rgba(0,0,0,0.65)',
        pop: '0 18px 48px -12px rgba(0,0,0,0.75)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out',
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
