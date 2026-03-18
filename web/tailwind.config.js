/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // macOS-like neutrals + accent so existing Tailwind utility classes match branding.
        gray: {
          50: '#f5f5f7',
          100: '#e5e5ea',
          200: '#d2d2d7',
          300: '#c7c7cc',
          400: '#8e8e93',
          500: '#6e6e73',
          600: '#6e6e73',
          700: '#1c1c1e',
          800: '#2c2c2e',
        },
        purple: {
          // Used by `bg-purple-600` / `text-purple-600` classes in the app.
          600: '#0A84FF',
        },
        red: {
          50: '#FFEFEF',
          200: '#FECACA',
          600: '#FF3B30',
          700: '#D92D20',
        },
        green: {
          50: '#E9FCEB',
          200: '#9BE39E',
          800: '#0A7A2A',
        },
      },
    },
  },
  plugins: [],
}

