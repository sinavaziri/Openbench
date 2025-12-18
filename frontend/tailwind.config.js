/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['neue-haas-unica', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        normal: '500',
        medium: '500',
        semibold: '500',
        bold: '500',
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
