/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#080B10',
          900: '#0D1218',
          800: '#131A22',
          700: '#1B2530',
          600: '#28333F',
        },
        call: {
          DEFAULT: '#2DD4A7',
          dim: '#1B7A5E',
        },
        put: {
          DEFAULT: '#FB6B5B',
          dim: '#9A3F35',
        },
        gold: '#E8B95C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
