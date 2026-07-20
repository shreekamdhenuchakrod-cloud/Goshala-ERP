/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f8f4',
          100: '#e2efe7',
          200: '#c5dfd0',
          300: '#9ac7ad',
          400: '#6ca884',
          500: '#488c63',
          600: '#36704c',
          700: '#2e593e',
          800: '#264833',
          900: '#203c2c',
        },
        saffron: {
          50: '#fdf9f2',
          100: '#faf0dd',
          200: '#f4dec1',
          300: '#ebc298',
          400: '#e0a16d',
          500: '#d57e49',
          600: '#c36336',
          700: '#a34c2d',
          800: '#843b27',
          900: '#6c3123',
        }
      }
    },
  },
  plugins: [],
}
