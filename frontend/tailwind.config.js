/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#040711',
          900: '#0a0f1d',
          850: '#0e1629',
          800: '#141e36',
          700: '#1e2c4f',
          600: '#2c3e6b',
        },
        nasa: {
          blue: '#0B3D91',
          red: '#FC3D21',
          cyan: '#00F0FF',
          amber: '#FFB800'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
