/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '600',
      },
      colors: {
        background: '#0c0c0c',
        foreground: '#ffffff',
        muted: '#888888',
        border: '#222222',
      },
      letterSpacing: {
        tight: '-0.02em',
        wide: '0.05em',
      },
    },
  },
  plugins: [],
}
