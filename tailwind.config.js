/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'deep-blue': '#0a1628',
        'navy': '#0f1e3d',
        'alarm-blue': '#1e40af',
        'alarm-orange': '#f97316',
        'success-green': '#10b981',
        'warning-amber': '#f59e0b',
        'info-cyan': '#06b6d4',
        'surface': '#111c33',
        'surface-light': '#1a2a4a',
        'border-dark': '#1e3a5f',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Menlo', 'monospace'],
        'sans': ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(30, 64, 175, 0.5), 0 0 10px rgba(30, 64, 175, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(30, 64, 175, 0.8), 0 0 30px rgba(30, 64, 175, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
