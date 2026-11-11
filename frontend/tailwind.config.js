/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official NASA Space Apps Challenge Brand Colors (from spaceappschallenge.org)
        spaceapps: {
          nearblack: '#1b1b1b',      // Primary dark text / footer background
          deepblue: '#151622',       // Deep space cards & dark section background
          neonblue: '#0050d8',       // Brand primary blue / H2 / active links
          electricblue: '#1b2b85',   // Electric blue / navigation background / gradient base
          neonyellow: '#e7f434',     // Primary CTA button / alert banner / metric value
          nasared: '#e52207',        // NASA accent red / important action / categories
          blueyonder: '#2491ff',     // Bright blue link hover / card accents
          paleyellow: '#fafaad',     // Navigation link hover state
          cloudgray: '#dfe1e2',      // Secondary light section background
          slategray: '#3d4551',      // Footer social strip / neutral dark
          claygray: '#8d9297',       // Secondary borders
        },
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
        sans: ['"Fira Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        'btn': '4px',
        'card': '10px'
      }
    },
  },
  plugins: [],
}
